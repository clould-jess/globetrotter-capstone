import os
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Annotated
from urllib.parse import unquote
from uuid import UUID, uuid4

import psycopg
from fastapi import Depends, FastAPI, Header, HTTPException, Query, status
from psycopg.rows import dict_row
from pydantic import BaseModel, ConfigDict, Field


DATABASE_URL = os.environ["DATABASE_URL"]


def connection():
    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as database:
        yield database


Database = Annotated[psycopg.Connection, Depends(connection)]
RequesterId = Annotated[UUID, Header(alias="X-User-ID")]
RequesterRole = Annotated[str, Header(alias="X-User-Role")]
EncodedDisplayName = Annotated[str, Header(alias="X-User-Display-Name")]


class MessageCreate(BaseModel):
    body: str = Field(min_length=1, max_length=1000)


class MessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    destination_slug: str
    user_id: UUID
    display_name: str
    body: str
    created_at: datetime


class CommunityStats(BaseModel):
    total_messages: int
    messages_24h: int
    active_rooms: int


def initialise_database() -> None:
    with psycopg.connect(DATABASE_URL) as database:
        database.execute(
            """
            CREATE TABLE IF NOT EXISTS messages (
              id UUID PRIMARY KEY,
              destination_slug VARCHAR(80) NOT NULL,
              user_id UUID NOT NULL,
              display_name VARCHAR(80) NOT NULL,
              body VARCHAR(1000) NOT NULL,
              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
        database.execute(
            "CREATE INDEX IF NOT EXISTS messages_room_created_idx "
            "ON messages(destination_slug, created_at DESC)"
        )
        database.execute(
            "CREATE INDEX IF NOT EXISTS messages_user_idx ON messages(user_id)"
        )


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialise_database()
    yield


app = FastAPI(
    title="Cameroon Project · Community Service",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health", tags=["operations"])
def health(database: Database) -> dict[str, str]:
    database.execute("SELECT 1")
    return {"status": "ok", "service": "community-service"}


@app.get("/rooms/{destination_slug}/messages", response_model=list[MessageRead], tags=["chat"])
def list_messages(
    destination_slug: str,
    database: Database,
    limit: int = Query(default=60, ge=1, le=100),
):
    if not destination_slug.replace("-", "").isalnum() or not 2 <= len(destination_slug) <= 80:
        raise HTTPException(status_code=422, detail="Invalid destination")
    return database.execute(
        """
        SELECT * FROM (
          SELECT id, destination_slug, user_id, display_name, body, created_at
          FROM messages
          WHERE destination_slug = %s
          ORDER BY created_at DESC
          LIMIT %s
        ) recent
        ORDER BY created_at
        """,
        (destination_slug, limit),
    ).fetchall()


@app.post(
    "/rooms/{destination_slug}/messages",
    response_model=MessageRead,
    status_code=status.HTTP_201_CREATED,
    tags=["chat"],
)
def create_message(
    destination_slug: str,
    payload: MessageCreate,
    database: Database,
    user_id: RequesterId,
    encoded_display_name: EncodedDisplayName,
):
    if not destination_slug.replace("-", "").isalnum() or not 2 <= len(destination_slug) <= 80:
        raise HTTPException(status_code=422, detail="Invalid destination")
    display_name = unquote(encoded_display_name).strip()[:80]
    if not display_name:
        raise HTTPException(status_code=400, detail="Display name is required")
    return database.execute(
        """
        INSERT INTO messages (id, destination_slug, user_id, display_name, body)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id, destination_slug, user_id, display_name, body, created_at
        """,
        (uuid4(), destination_slug, user_id, display_name, payload.body.strip()),
    ).fetchone()


@app.delete("/messages/{message_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["chat"])
def delete_message(
    message_id: UUID,
    database: Database,
    user_id: RequesterId,
    role: RequesterRole,
):
    deleted = database.execute(
        """
        DELETE FROM messages
        WHERE id = %s AND (user_id = %s OR %s = 'admin')
        RETURNING id
        """,
        (message_id, user_id, role),
    ).fetchone()
    if not deleted:
        raise HTTPException(status_code=404, detail="Message not found or access denied")


@app.get("/admin/stats", response_model=CommunityStats, tags=["admin"])
def admin_stats(database: Database, role: RequesterRole):
    if role != "admin":
        raise HTTPException(status_code=403, detail="Administrator role required")
    return database.execute(
        """
        SELECT
          COUNT(*)::int AS total_messages,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::int AS messages_24h,
          COUNT(DISTINCT destination_slug)::int AS active_rooms
        FROM messages
        """
    ).fetchone()
