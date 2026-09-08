"""Bounded, authenticated proxies. No user-controlled upstream URLs."""
import json
import os
import time
from threading import Lock
from typing import Literal
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from .security import User

router = APIRouter(prefix="/maps")
cache = {}
gate = Lock()
last_request = 0.0


def upstream(key, url, data=None):
    global last_request
    now = time.monotonic()
    with gate:
        if key in cache and now - cache[key][0] < 600:
            return cache[key][1]
        if now - last_request < 1:
            raise HTTPException(429, "Map provider busy. Retry in a moment.")
        last_request = now
    try:
        request = Request(url, data=data, headers={"User-Agent": "CameroonProject/2.0", "Content-Type": "application/x-www-form-urlencoded"})
        with urlopen(request, timeout=25) as response:
            raw = response.read(4 * 1024 * 1024 + 1)
            if len(raw) > 4 * 1024 * 1024:
                raise ValueError("Response too large")
            result = json.loads(raw)
        with gate:
            if len(cache) >= 100:
                cache.pop(next(iter(cache)))
            cache[key] = (now, result)
        return result
    except (HTTPError, URLError, TimeoutError, ValueError) as error:
        raise HTTPException(503, "Map provider unavailable. Please try later or open Google Maps.") from error


class Point(BaseModel):
    lat: float = Field(ge=-90, le=90, allow_inf_nan=False)
    lng: float = Field(ge=-180, le=180, allow_inf_nan=False)


class RouteRequest(BaseModel):
    stops: list[Point] = Field(min_length=2, max_length=10)


@router.post("/route")
def route(payload: RouteRequest, user: User):
    coordinates = ";".join(f"{p.lng:.6f},{p.lat:.6f}" for p in payload.stops)
    base = os.getenv("OSRM_BASE_URL", "https://router.project-osrm.org").rstrip("/")
    result = upstream("route:" + coordinates, f"{base}/route/v1/driving/{coordinates}?overview=full&geometries=geojson&steps=false")
    if result.get("code") != "Ok" or not result.get("routes"):
        raise HTTPException(422, "No drivable route found between these stops")
    best = result["routes"][0]
    return {"distance": best["distance"], "duration": best["duration"], "geometry": best["geometry"],
            "legs": [{"distance": leg["distance"], "duration": leg["duration"]} for leg in best["legs"]],
            "live_traffic": False}


@router.get("/places")
def places(user: User, kind: Literal["gym", "monument", "ministry"],
           lat: float = Query(ge=1, le=14, allow_inf_nan=False),
           lng: float = Query(ge=8, le=17, allow_inf_nan=False)):
    filters = {"gym": ['[leisure=fitness_centre]', '[leisure=sports_centre][sport=fitness]'],
               "monument": ['[historic=monument]', '[historic=memorial]'],
               "ministry": ['[office=government][government=ministry]', '[office=government][name~"Minist|MINIST"]']}
    center = f"{lat:.3f},{lng:.3f}"
    query = "[out:json][timeout:20];(" + "".join(f"nwr(around:15000,{center}){selector};" for selector in filters[kind]) + ");out center tags 100;"
    base = os.getenv("OVERPASS_URL", "https://overpass-api.de/api/interpreter")
    result = upstream(f"places:{kind}:{center}", base, urlencode({"data": query}).encode())
    output = []
    for item in result.get("elements", [])[:100]:
        tags = item.get("tags", {})
        point = item.get("center", item)
        if not tags.get("name") or "lat" not in point or "lon" not in point:
            continue
        output.append({"id": f"osm-{item['type']}-{item['id']}", "name": tags["name"][:120],
                       "lat": point["lat"], "lng": point["lon"], "kind": kind,
                       "address": tags.get("addr:street", ""),
                       "source": f"https://www.openstreetmap.org/{item['type']}/{item['id']}"})
    return {"places": output, "attribution": "© OpenStreetMap contributors", "radius_km": 15}
