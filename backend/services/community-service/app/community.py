"""Authenticated community API. Migrations preserve existing destination messages."""
import os
import re
from contextlib import asynccontextmanager
from typing import Annotated
from uuid import UUID, uuid4

import psycopg
from fastapi import Depends, FastAPI, File, Form, HTTPException, Query, Response, UploadFile
from psycopg.rows import dict_row
from pydantic import BaseModel, ConfigDict, Field, field_validator

from .media import MAX_UPLOAD, sanitise_media
from .security import User

DATABASE_URL = os.environ["DATABASE_URL"]


def connection():
    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as database:
        yield database


Database = Annotated[psycopg.Connection, Depends(connection)]


class TextModel(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")


class MessageCreate(TextModel):
    body: str = Field(min_length=1, max_length=1000)


class GroupCreate(TextModel):
    name: str = Field(min_length=2, max_length=80)
    description: str = Field(default="", max_length=400)


class ReviewCreate(TextModel):
    rating: int = Field(ge=1, le=5, strict=True)
    body: str = Field(min_length=5, max_length=1000)


class Stop(TextModel):
    name: str = Field(min_length=1, max_length=120)
    lat: float = Field(ge=-90, le=90, allow_inf_nan=False)
    lng: float = Field(ge=-180, le=180, allow_inf_nan=False)


class JourneyCreate(TextModel):
    name: str = Field(min_length=2, max_length=100)
    stops: list[Stop] = Field(min_length=2, max_length=10)


def slug_valid(slug: str):
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{1,79}", slug):
        raise HTTPException(422, "Invalid place or room")


def room_access(database, slug, user):
    slug_valid(slug)
    if slug.startswith("group-"):
        group = database.execute("SELECT id FROM chat_groups WHERE id = %s", (slug,)).fetchone()
        if not group:
            raise HTTPException(404, "Group not found")
        member = database.execute("SELECT 1 FROM group_members WHERE group_id = %s AND user_id = %s", (slug, user.id)).fetchone()
        if not member and user.role != "admin":
            raise HTTPException(403, "Join this group to read and send messages")


def initialise_database():
    with psycopg.connect(DATABASE_URL) as database:
        database.execute("""CREATE TABLE IF NOT EXISTS messages (
            id UUID PRIMARY KEY, destination_slug VARCHAR(80) NOT NULL,
            user_id UUID NOT NULL, display_name VARCHAR(80) NOT NULL,
            body VARCHAR(1000) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())""")
        database.execute("ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_kind VARCHAR(10)")
        database.execute("CREATE INDEX IF NOT EXISTS messages_room_created_idx ON messages(destination_slug, created_at DESC)")
        database.execute("CREATE INDEX IF NOT EXISTS messages_user_idx ON messages(user_id)")
        database.execute("""CREATE TABLE IF NOT EXISTS message_media (
            message_id UUID PRIMARY KEY REFERENCES messages(id) ON DELETE CASCADE,
            content_type VARCHAR(40) NOT NULL, data BYTEA NOT NULL)""")
        database.execute("""CREATE TABLE IF NOT EXISTS chat_groups (
            id VARCHAR(80) PRIMARY KEY, name VARCHAR(80) NOT NULL, description VARCHAR(400) NOT NULL,
            owner_id UUID NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())""")
        database.execute("""CREATE TABLE IF NOT EXISTS group_members (
            group_id VARCHAR(80) REFERENCES chat_groups(id) ON DELETE CASCADE,
            user_id UUID NOT NULL, PRIMARY KEY (group_id, user_id))""")
        database.execute("""CREATE TABLE IF NOT EXISTS reviews (
            id UUID PRIMARY KEY, place_slug VARCHAR(80) NOT NULL, user_id UUID NOT NULL,
            display_name VARCHAR(80) NOT NULL, rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
            body VARCHAR(1000) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE(place_slug, user_id))""")
        database.execute("""CREATE TABLE IF NOT EXISTS journeys (
            id UUID PRIMARY KEY, user_id UUID NOT NULL, name VARCHAR(100) NOT NULL,
            stops JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())""")
        database.execute("CREATE INDEX IF NOT EXISTS journeys_user_idx ON journeys(user_id)")


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialise_database()
    yield


app = FastAPI(title="Cameroon Community", version="2.0.0", lifespan=lifespan)


@app.middleware("http")
async def private_responses(request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "private, no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


@app.get("/health")
def health(database: Database):
    database.execute("SELECT 1")
    return {"status": "ok", "service": "community-service"}


@app.get("/groups")
def groups(user: User, database: Database):
    return database.execute("""SELECT g.*,
        (SELECT COUNT(*) FROM group_members WHERE group_id = g.id)::int AS member_count,
        EXISTS(SELECT 1 FROM group_members WHERE group_id = g.id AND user_id = %s) AS joined
        FROM chat_groups g ORDER BY created_at DESC LIMIT 100""", (user.id,)).fetchall()


@app.post("/groups", status_code=201)
def create_group(payload: GroupCreate, user: User, database: Database):
    database.execute("SELECT pg_advisory_xact_lock(hashtext(%s))", (str(user.id),))
    count = database.execute("SELECT COUNT(*) AS n FROM chat_groups WHERE owner_id = %s", (user.id,)).fetchone()["n"]
    if count >= 20:
        raise HTTPException(429, "Maximum 20 groups per account")
    group = database.execute("""INSERT INTO chat_groups (id, name, description, owner_id)
        VALUES (%s,%s,%s,%s) RETURNING *""", ("group-" + str(uuid4()), payload.name, payload.description, user.id)).fetchone()
    database.execute("INSERT INTO group_members VALUES (%s,%s)", (group["id"], user.id))
    return {**group, "joined": True, "member_count": 1}


@app.post("/groups/{group_id}/join", status_code=204)
def join_group(group_id: str, user: User, database: Database):
    if not database.execute("SELECT id FROM chat_groups WHERE id = %s", (group_id,)).fetchone():
        raise HTTPException(404, "Group not found")
    database.execute("INSERT INTO group_members VALUES (%s,%s) ON CONFLICT DO NOTHING", (group_id, user.id))


@app.delete("/groups/{group_id}/membership", status_code=204)
def leave_group(group_id: str, user: User, database: Database):
    database.execute("DELETE FROM group_members WHERE group_id = %s AND user_id = %s", (group_id, user.id))


@app.get("/rooms/{slug}/messages")
def messages(slug: str, user: User, database: Database, limit: int = Query(60, ge=1, le=100)):
    room_access(database, slug, user)
    return database.execute("""SELECT * FROM (SELECT * FROM messages WHERE destination_slug = %s
        ORDER BY created_at DESC, id DESC LIMIT %s) recent ORDER BY created_at, id""", (slug, limit)).fetchall()


def insert_message(database, slug, user, body, kind=None):
    # Serialize per-user posting and enforce a limit that also applies to uploads.
    database.execute("SELECT pg_advisory_xact_lock(hashtext(%s))", (str(user.id),))
    count = database.execute("SELECT COUNT(*) AS n FROM messages WHERE user_id = %s AND created_at > NOW() - INTERVAL '1 minute'", (user.id,)).fetchone()["n"]
    if count >= 20:
        raise HTTPException(429, "Please wait before sending more messages")
    return database.execute("""INSERT INTO messages (id,destination_slug,user_id,display_name,body,media_kind)
        VALUES (%s,%s,%s,%s,%s,%s) RETURNING *""", (uuid4(), slug, user.id, user.display_name, body, kind)).fetchone()


@app.post("/rooms/{slug}/messages", status_code=201)
def post_message(slug: str, payload: MessageCreate, user: User, database: Database):
    room_access(database, slug, user)
    return insert_message(database, slug, user, payload.body)


@app.post("/rooms/{slug}/attachments", status_code=201)
def post_attachment(slug: str, user: User, database: Database,
                    file: UploadFile = File(), kind: str = Form(), body: str = Form(default="", max_length=1000)):
    room_access(database, slug, user)
    data = file.file.read(MAX_UPLOAD + 1)
    clean, content_type = sanitise_media(data, kind)
    message = insert_message(database, slug, user, body.strip(), kind)
    database.execute("SELECT pg_advisory_xact_lock(237237)")
    total = database.execute("SELECT COALESCE(SUM(octet_length(data)),0) AS bytes FROM message_media").fetchone()["bytes"]
    if total + len(clean) > int(os.getenv("MEDIA_STORAGE_LIMIT_MB", "1024")) * 1024 * 1024:
        raise HTTPException(507, "Community media storage is full. Contact the administrator.")
    used = database.execute("""SELECT COALESCE(SUM(octet_length(a.data)),0) AS bytes
        FROM message_media a JOIN messages m ON m.id = a.message_id WHERE m.user_id = %s""", (user.id,)).fetchone()["bytes"]
    if used + len(clean) > 100 * 1024 * 1024:
        raise HTTPException(413, "Your 100 MB media quota is full. Delete old media to free space.")
    database.execute("INSERT INTO message_media VALUES (%s,%s,%s)", (message["id"], content_type, clean))
    return message


@app.get("/media/{message_id}")
def media(message_id: UUID, user: User, database: Database):
    row = database.execute("""SELECT m.destination_slug, a.content_type, a.data
        FROM messages m JOIN message_media a ON a.message_id = m.id WHERE m.id = %s""", (message_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Attachment not found")
    room_access(database, row["destination_slug"], user)
    return Response(bytes(row["data"]), media_type=row["content_type"], headers={"Content-Disposition": "inline", "Content-Security-Policy": "default-src 'none'; sandbox"})


@app.delete("/messages/{message_id}", status_code=204)
def delete_message(message_id: UUID, user: User, database: Database):
    row = database.execute("DELETE FROM messages WHERE id = %s AND (user_id = %s OR %s = 'admin') RETURNING id", (message_id, user.id, user.role)).fetchone()
    if not row:
        raise HTTPException(404, "Message not found or access denied")


@app.get("/reviews/{slug}")
def reviews(slug: str, user: User, database: Database):
    slug_valid(slug)
    summary = database.execute("SELECT COUNT(*)::int AS count, AVG(rating)::float AS average FROM reviews WHERE place_slug = %s", (slug,)).fetchone()
    rows = database.execute("SELECT * FROM reviews WHERE place_slug = %s ORDER BY created_at DESC LIMIT 100", (slug,)).fetchall()
    return {**summary, "reviews": rows}


@app.put("/reviews/{slug}")
def put_review(slug: str, payload: ReviewCreate, user: User, database: Database):
    slug_valid(slug)
    return database.execute("""INSERT INTO reviews (id,place_slug,user_id,display_name,rating,body)
        VALUES (%s,%s,%s,%s,%s,%s) ON CONFLICT (place_slug,user_id) DO UPDATE SET
        rating = EXCLUDED.rating, body = EXCLUDED.body, display_name = EXCLUDED.display_name,
        created_at = NOW() RETURNING *""", (uuid4(), slug, user.id, user.display_name, payload.rating, payload.body)).fetchone()


@app.delete("/reviews/{review_id}", status_code=204)
def delete_review(review_id: UUID, user: User, database: Database):
    if not database.execute("DELETE FROM reviews WHERE id = %s AND (user_id = %s OR %s = 'admin') RETURNING id", (review_id, user.id, user.role)).fetchone():
        raise HTTPException(404, "Review not found or access denied")


@app.get("/journeys")
def journeys(user: User, database: Database):
    return database.execute("SELECT * FROM journeys WHERE user_id = %s ORDER BY created_at DESC LIMIT 50", (user.id,)).fetchall()


@app.post("/journeys", status_code=201)
def save_journey(payload: JourneyCreate, user: User, database: Database):
    from psycopg.types.json import Jsonb
    database.execute("SELECT pg_advisory_xact_lock(hashtext(%s))", (str(user.id),))
    if database.execute("SELECT COUNT(*) AS n FROM journeys WHERE user_id = %s", (user.id,)).fetchone()["n"] >= 50:
        raise HTTPException(409, "Maximum 50 saved itineraries. Delete one first.")
    return database.execute("INSERT INTO journeys (id,user_id,name,stops) VALUES (%s,%s,%s,%s) RETURNING *", (uuid4(), user.id, payload.name, Jsonb([stop.model_dump() for stop in payload.stops]))).fetchone()


@app.delete("/journeys/{journey_id}", status_code=204)
def delete_journey(journey_id: UUID, user: User, database: Database):
    if not database.execute("DELETE FROM journeys WHERE id = %s AND user_id = %s RETURNING id", (journey_id, user.id)).fetchone():
        raise HTTPException(404, "Itinerary not found")


@app.get("/admin/stats")
def stats(user: User, database: Database):
    if user.role != "admin":
        raise HTTPException(403, "Administrator role required")
    return database.execute("""SELECT COUNT(*)::int AS total_messages,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::int AS messages_24h,
        COUNT(DISTINCT destination_slug)::int AS active_rooms FROM messages""").fetchone()


from .maps import router as maps_router
app.include_router(maps_router)
