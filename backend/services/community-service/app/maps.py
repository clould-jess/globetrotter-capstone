"""Bounded, authenticated proxies. No user-controlled upstream URLs."""
import json
import math
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
last_request = {}


def upstream(key, url, data=None):
    provider = key.split(":", 1)[0]
    now = time.monotonic()
    with gate:
        if key in cache and now - cache[key][0] < 600:
            return cache[key][1]
        if now - last_request.get(provider, -float("inf")) < 1:
            raise HTTPException(429, "Map provider busy. Retry in a moment.")
        last_request[provider] = now
    try:
        request = Request(url, data=data, headers={"User-Agent": "CameroonProject/2.0", "Content-Type": "application/x-www-form-urlencoded"})
        with urlopen(request, timeout=25) as response:
            raw = response.read(4 * 1024 * 1024 + 1)
            if len(raw) > 4 * 1024 * 1024:
                raise ValueError("Response too large")
            result = json.loads(raw)
            if not isinstance(result, dict):
                raise ValueError("Invalid provider response")
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
    try:
        best = result["routes"][0]
        geometry = best["geometry"]
        coordinates = geometry["coordinates"]
        legs = [{"distance": leg["distance"], "duration": leg["duration"]} for leg in best["legs"]]
        metrics = [best["distance"], best["duration"], *[n for leg in legs for n in leg.values()]]
        if (geometry.get("type") != "LineString" or len(coordinates) < 2
                or len(legs) != len(payload.stops) - 1
                or any(not isinstance(n, (int, float)) or not math.isfinite(n) or n < 0 for n in metrics)
                or any(len(p) != 2 or not all(isinstance(n, (int, float)) and math.isfinite(n) for n in p)
                       or not -180 <= p[0] <= 180 or not -90 <= p[1] <= 90 for p in coordinates)):
            raise ValueError("Invalid route")
        return {"distance": best["distance"], "duration": best["duration"], "geometry": geometry,
                "legs": legs, "live_traffic": False}
    except (KeyError, IndexError, TypeError, ValueError) as error:
        raise HTTPException(503, "Invalid route provider response. Please retry later.") from error


def distance_m(lat, lng, other_lat, other_lng):
    a, b = math.radians(lat), math.radians(other_lat)
    h = math.sin((b-a)/2)**2 + math.cos(a)*math.cos(b)*math.sin(math.radians(other_lng-lng)/2)**2
    return round(6371000 * 2 * math.asin(math.sqrt(min(1, max(0, h)))))


@router.get("/places")
def places(user: User, kind: Literal["gym", "monument", "ministry", "restaurant", "site", "hotel"],
           lat: float = Query(ge=1, le=14, allow_inf_nan=False),
           lng: float = Query(ge=8, le=17, allow_inf_nan=False)):
    filters = {"gym": ['[leisure=fitness_centre]', '[leisure=sports_centre][sport=fitness]'],
               "monument": ['[historic=monument]', '[historic=memorial]'],
               "ministry": ['[office=government][government=ministry]', '[office=government][name~"Minist|MINIST"]'],
               "restaurant": ['[amenity=restaurant]', '[amenity=fast_food]'],
               "site": ['[tourism=attraction]', '[tourism=museum]', '[tourism=viewpoint]'],
               "hotel": ['[tourism=hotel]', '[tourism=guest_house]', '[tourism=motel]']}
    center = f"{lat:.3f},{lng:.3f}"
    query = "[out:json][timeout:20];(" + "".join(f"nwr(around:15000,{center}){selector};" for selector in filters[kind]) + ");out center tags 100;"
    base = os.getenv("OVERPASS_URL", "https://overpass-api.de/api/interpreter")
    result = upstream(f"places:{kind}:{center}", base, urlencode({"data": query}).encode())
    if result.get("remark") or not isinstance(result.get("elements"), list):
        raise HTTPException(503, "Place search incomplete. Please retry later.")
    output = []
    seen = set()
    for item in result.get("elements", [])[:100]:
        if not isinstance(item, dict):
            continue
        tags = item.get("tags", {})
        point = item.get("center", item)
        if not isinstance(tags, dict) or not isinstance(point, dict) or not isinstance(tags.get("name"), str):
            continue
        if (item.get("type") not in {"node", "way", "relation"} or not isinstance(item.get("id"), int)
                or not isinstance(point.get("lat"), (int, float)) or not isinstance(point.get("lon"), (int, float))):
            continue
        if not 1 <= point["lat"] <= 14 or not 8 <= point["lon"] <= 17:
            continue
        identity = (item["type"], item["id"])
        if identity in seen:
            continue
        seen.add(identity)
        distance = distance_m(lat, lng, point["lat"], point["lon"])
        if distance > 15000 or not tags["name"].strip():
            continue
        output.append({"id": f"osm-{item['type']}-{item['id']}", "name": tags["name"][:120],
                       "lat": point["lat"], "lng": point["lon"], "kind": kind,
                       "address": str(tags.get("addr:street", ""))[:200],
                       "distance_m": distance,
                       "source": f"https://www.openstreetmap.org/{item['type']}/{item['id']}"})
    output.sort(key=lambda p: (p["distance_m"], p["name"]))
    return {"places": output, "attribution": "© OpenStreetMap contributors", "radius_km": 15,
            "center": {"lat": lat, "lng": lng}}
