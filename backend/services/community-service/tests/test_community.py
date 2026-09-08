import io
import os
import sys
from pathlib import Path
from unittest.mock import Mock, patch
from uuid import uuid4

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from PIL import Image
from pydantic import ValidationError
from starlette.requests import Request

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("DATABASE_URL", "postgresql://unused/test")
from app.community import app, connection, GroupCreate, JourneyCreate, MessageCreate, ReviewCreate, room_access, insert_message
from app.maps import RouteRequest
from app.media import MAX_UPLOAD, sanitise_media
from app.security import Identity, authenticated


def identity(role="user"):
    return Identity(id=uuid4(), display_name="Test traveller", role=role)


@pytest.mark.parametrize("url", ["/groups", "/rooms/kribi/messages", f"/media/{uuid4()}", "/reviews/kribi", "/journeys", "/admin/stats", "/maps/places?kind=gym&lat=3.86&lng=11.5"])
def test_unauthenticated_requests_rejected_before_database(url):
    with patch("app.community.psycopg.connect", side_effect=AssertionError("Unauthenticated database access")):
        response = TestClient(app).get(url, headers={"X-User-ID": str(uuid4()), "X-User-Role": "admin"})
    assert response.status_code == 401
    assert response.headers["cache-control"] == "private, no-store"


def test_cross_site_write_is_rejected():
    request = Request({"type": "http", "method": "POST", "headers": [(b"cookie", b"cameroon_session=test"), (b"sec-fetch-site", b"cross-site")]})
    with pytest.raises(HTTPException) as error:
        authenticated(request)
    assert error.value.status_code == 403


@pytest.mark.parametrize("value", ["", "   ", "x" * 1001])
def test_blank_or_long_messages_rejected(value):
    with pytest.raises(ValidationError):
        MessageCreate(body=value)


def test_trim_and_limits():
    assert MessageCreate(body=" hello ").body == "hello"
    with pytest.raises(ValidationError): GroupCreate(name="  ")
    for rating in [0, 6, 1.5, True]:
        with pytest.raises(ValidationError): ReviewCreate(rating=rating, body="A good place")
    with pytest.raises(ValidationError): JourneyCreate(name="Journey", stops=[])
    with pytest.raises(ValidationError): RouteRequest(stops=[{"lat": float("nan"), "lng": 11}] * 2)
    with pytest.raises(ValidationError): RouteRequest(stops=[{"lat": 100, "lng": 11}] * 2)
    with pytest.raises(ValidationError): RouteRequest(stops=[{"lat": 3, "lng": 11}] * 11)


def test_group_messages_require_membership():
    database = Mock()
    database.execute.return_value.fetchone.side_effect = [{"id": "group-test"}, None]
    with pytest.raises(HTTPException) as error: room_access(database, "group-test", identity())
    assert error.value.status_code == 403


def test_member_and_admin_can_read_group():
    for role in ["user", "admin"]:
        database = Mock()
        database.execute.return_value.fetchone.side_effect = [{"id": "group-test"}, {"exists": 1} if role == "user" else None]
        room_access(database, "group-test", identity(role))


def test_missing_group_and_invalid_room():
    database = Mock()
    database.execute.return_value.fetchone.return_value = None
    with pytest.raises(HTTPException) as error: room_access(database, "group-missing", identity())
    assert error.value.status_code == 404
    with pytest.raises(HTTPException) as error: room_access(database, "../private", identity())
    assert error.value.status_code == 422


def test_server_post_rate_limit():
    database = Mock()
    database.execute.return_value.fetchone.return_value = {"n": 20}
    with pytest.raises(HTTPException) as error: insert_message(database, "kribi", identity(), "Hello")
    assert error.value.status_code == 429
    assert not any("INSERT INTO messages" in call.args[0] for call in database.execute.call_args_list)


def test_image_is_reencoded_without_metadata():
    output = io.BytesIO()
    original = Image.new("RGB", (20, 20), color="blue")
    exif = Image.Exif(); exif[270] = "PRIVATE LOCATION"
    original.save(output, format="JPEG", exif=exif)
    data, content_type = sanitise_media(output.getvalue(), "image")
    assert content_type == "image/jpeg"
    with Image.open(io.BytesIO(data)) as clean:
        assert clean.size == (20, 20)
        assert not clean.getexif()
    assert b"PRIVATE LOCATION" not in data


@pytest.mark.parametrize("data,kind,code", [(b"<svg onload='alert(1)'/>", "image", 422), (b"#EXTM3U\nhttps://internal/secrets", "audio", 422), (b"x" * (MAX_UPLOAD + 1), "image", 413), (b"", "image", 413), (b"hello", "video", 422)], ids=["svg", "playlist", "oversized", "empty", "unsupported"])
def test_invalid_uploads_rejected(data, kind, code):
    with pytest.raises(HTTPException) as error: sanitise_media(data, kind)
    assert error.value.status_code == code


def test_non_admin_stats_denied():
    app.dependency_overrides[authenticated] = lambda: identity()
    app.dependency_overrides[connection] = lambda: Mock()
    try:
        assert TestClient(app).get("/admin/stats").status_code == 403
    finally:
        app.dependency_overrides.clear()


def test_map_provider_failure_not_a_fake_route():
    app.dependency_overrides[authenticated] = lambda: identity()
    try:
        with patch("app.maps.upstream", return_value={"code": "NoRoute"}):
            response = TestClient(app).post("/maps/route", json={"stops": [{"lat": 3, "lng": 11}, {"lat": 4, "lng": 12}]})
        assert response.status_code == 422
    finally:
        app.dependency_overrides.clear()
