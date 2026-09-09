import os
import sys
from pathlib import Path
from unittest.mock import Mock
from uuid import uuid4

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("DATABASE_URL", "postgresql://unused/test")
from app import maps
from app.community import app, update_journey, JourneyCreate
from app.security import authenticated, Identity


@pytest.fixture
def client():
    app.dependency_overrides[authenticated] = lambda: Identity(id=uuid4(), display_name="Test", role="user")
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


@pytest.mark.parametrize("kind,selector", [("restaurant", "amenity=restaurant"), ("site", "tourism=museum"), ("hotel", "tourism=hotel"), ("gym", "fitness_centre"), ("monument", "historic=monument"), ("ministry", "government=ministry")])
def test_categories_are_allowlisted(client, monkeypatch, kind, selector):
    from urllib.parse import parse_qs
    upstream = Mock(return_value={"elements": []})
    monkeypatch.setattr(maps, "upstream", upstream)
    response = client.get("/maps/places", params={"kind":kind, "lat":3.86, "lng":11.5})
    assert response.status_code == 200
    assert selector in parse_qs(upstream.call_args.args[2].decode())["data"][0]


@pytest.mark.parametrize("params", [{"kind":"injection"}, {"lat":90}, {"lng":-20}, {"lat":"nan"}])
def test_invalid_search(client, params):
    assert client.get("/maps/places", params={"kind":"gym","lat":3.86,"lng":11.5,**params}).status_code == 422


def test_distances_dedup_and_bad_elements(client, monkeypatch):
    node = {"type":"node","id":1,"lat":3.87,"lon":11.5,"tags":{"name":"Gym"}}
    monkeypatch.setattr(maps,"upstream",lambda *a: {"elements":[node,node,{**node,"id":2,"lat":3.86}, {**node,"id":3,"lat":float("nan")}, {**node,"type":"../../private"}, None]})
    response = client.get("/maps/places?kind=gym&lat=3.86&lng=11.5")
    rows = response.json()["places"]
    assert len(rows) == 2 and rows[0]["distance_m"] == 0
    assert rows[1]["distance_m"] > 1000
    assert rows[0]["source"] == "https://www.openstreetmap.org/node/2"


@pytest.mark.parametrize("value", [{"remark":"runtime timeout","elements":[]}, {"elements":None}, {}])
def test_partial_overpass_is_not_empty_success(client, monkeypatch, value):
    monkeypatch.setattr(maps,"upstream",lambda *a: value)
    assert client.get("/maps/places?kind=gym&lat=3.86&lng=11.5").status_code == 503


def good_route():
    return {"code":"Ok","routes":[{"distance":1200,"duration":300,"geometry":{"type":"LineString","coordinates":[[11.5,3.86],[11.51,3.87]]},"legs":[{"distance":1200,"duration":300}]}]}


def test_route_shape(client, monkeypatch):
    monkeypatch.setattr(maps,"upstream",lambda *a: good_route())
    response = client.post("/maps/route",json={"stops":[{"lat":3.86,"lng":11.5},{"lat":3.87,"lng":11.51}]})
    assert response.status_code == 200 and response.json()["live_traffic"] is False


@pytest.mark.parametrize("field,value", [("duration",-1),("distance",float("inf")),("legs",[]),("geometry",{}),("geometry",{"type":"LineString","coordinates":[[999,3],[11,4]]})])
def test_malformed_route_rejected(client,monkeypatch,field,value):
    data=good_route(); data["routes"][0][field]=value
    monkeypatch.setattr(maps,"upstream",lambda *a:data)
    assert client.post("/maps/route",json={"stops":[{"lat":3,"lng":11},{"lat":4,"lng":12}]}).status_code == 503


def test_provider_throttles_are_independent(monkeypatch):
    maps.cache.clear(); maps.last_request.clear()
    response=Mock(); response.read.return_value=b'{}'
    opened=Mock(); opened.__enter__=Mock(return_value=response); opened.__exit__=Mock(return_value=False)
    monkeypatch.setattr(maps,"urlopen",Mock(return_value=opened))
    assert maps.upstream("places:test","https://test.invalid") == {}
    assert maps.upstream("route:test","https://test.invalid") == {}
    with pytest.raises(HTTPException) as error:
        maps.upstream("route:second","https://test.invalid")
    assert error.value.status_code == 429
    assert maps.upstream("route:test","https://test.invalid") == {}


def test_update_journey_is_owner_scoped():
    db=Mock(); db.execute.return_value.fetchone.return_value=None
    user=Identity(id=uuid4(),display_name="Admin",role="admin")
    payload=JourneyCreate(name="Test route",stops=[{"name":"A","lat":3,"lng":11,"approximate":True},{"name":"B","lat":4,"lng":12}])
    with pytest.raises(HTTPException) as error:
        update_journey(uuid4(),payload,user,db)
    assert error.value.status_code == 404
    assert "user_id = %s" in db.execute.call_args.args[0]
    assert db.execute.call_args.args[1][-1] == user.id
    assert payload.stops[0].approximate is True
