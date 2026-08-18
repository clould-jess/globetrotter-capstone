import asyncio
import json
import os
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID, uuid4

import aio_pika
import psycopg
from fastapi import BackgroundTasks, Depends, FastAPI, Header, HTTPException, Query, Response, status
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
from pydantic import BaseModel, ConfigDict, Field


DATABASE_URL = os.environ["DATABASE_URL"]
RABBITMQ_URL = os.getenv("RABBITMQ_URL", "")


def connection():
    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as database:
        yield database


Database = Annotated[psycopg.Connection, Depends(connection)]
OwnerId = Annotated[UUID, Header(alias="X-User-ID")]


class Stop(BaseModel):
    slug: str = Field(min_length=2, max_length=80, pattern=r"^[a-z0-9-]+$")
    days: int = Field(default=1, ge=1, le=14)


class ItineraryCreate(BaseModel):
    title: str = Field(min_length=2, max_length=120)
    stops: list[Stop] = Field(default_factory=list, max_length=20)


class ItineraryUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=120)
    stops: list[Stop] | None = Field(default=None, max_length=20)
    visibility: Literal["private", "public"] | None = None


class ItineraryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    owner_id: UUID
    title: str
    stops: list[Stop]
    visibility: Literal["private", "public"]
    created_at: datetime
    updated_at: datetime


def initialise_database() -> None:
    with psycopg.connect(DATABASE_URL) as database:
        database.execute(
            """
            CREATE TABLE IF NOT EXISTS itineraries (
              id UUID PRIMARY KEY,
              owner_id UUID NOT NULL,
              title VARCHAR(120) NOT NULL,
              stops JSONB NOT NULL DEFAULT '[]'::jsonb,
              visibility VARCHAR(10) NOT NULL DEFAULT 'private'
                CHECK (visibility IN ('private', 'public')),
              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
        database.execute("CREATE INDEX IF NOT EXISTS itineraries_owner_idx ON itineraries(owner_id)")


async def publish_event(name: str, payload: dict) -> None:
    if not RABBITMQ_URL:
        return
    try:
        connection = await asyncio.wait_for(aio_pika.connect_robust(RABBITMQ_URL), timeout=2)
        async with connection:
            channel = await connection.channel()
            exchange = await channel.declare_exchange(
                "cameroon.events", aio_pika.ExchangeType.TOPIC, durable=True
            )
            await exchange.publish(
                aio_pika.Message(
                    body=json.dumps(payload).encode(),
                    content_type="application/json",
                    delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
                ),
                routing_key=name,
            )
    except (aio_pika.AMQPException, TimeoutError, OSError):
        # The REST write remains available if the event broker is restarting.
        return


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialise_database()
    yield


app = FastAPI(
    title="Cameroon Project · Itinerary Service",
    version="2.0.0",
    lifespan=lifespan,
)


@app.get("/health", tags=["operations"])
def health(database: Database) -> dict[str, str]:
    database.execute("SELECT 1")
    return {"status": "ok", "service": "itinerary-service"}


@app.post(
    "/itineraries",
    response_model=ItineraryRead,
    status_code=status.HTTP_201_CREATED,
    tags=["itineraries"],
)
def create_itinerary(
    payload: ItineraryCreate,
    owner_id: OwnerId,
    database: Database,
    background_tasks: BackgroundTasks,
):
    itinerary_id = uuid4()
    itinerary = database.execute(
        """
        INSERT INTO itineraries (id, owner_id, title, stops)
        VALUES (%s, %s, %s, %s)
        RETURNING id, owner_id, title, stops, visibility, created_at, updated_at
        """,
        (itinerary_id, owner_id, payload.title.strip(), Jsonb([stop.model_dump() for stop in payload.stops])),
    ).fetchone()
    background_tasks.add_task(
        publish_event,
        "itinerary.created",
        {"itinerary_id": str(itinerary_id), "owner_id": str(owner_id)},
    )
    return itinerary


@app.get("/itineraries", response_model=list[ItineraryRead], tags=["itineraries"])
def list_itineraries(
    owner_id: OwnerId,
    database: Database,
    limit: int = Query(default=25, ge=1, le=100),
):
    return database.execute(
        """
        SELECT id, owner_id, title, stops, visibility, created_at, updated_at
        FROM itineraries WHERE owner_id = %s ORDER BY updated_at DESC LIMIT %s
        """,
        (owner_id, limit),
    ).fetchall()


@app.get("/itineraries/{itinerary_id}", response_model=ItineraryRead, tags=["itineraries"])
def get_itinerary(itinerary_id: UUID, owner_id: OwnerId, database: Database):
    itinerary = database.execute(
        """
        SELECT id, owner_id, title, stops, visibility, created_at, updated_at
        FROM itineraries WHERE id = %s AND owner_id = %s
        """,
        (itinerary_id, owner_id),
    ).fetchone()
    if not itinerary:
        raise HTTPException(status_code=404, detail="Itinerary not found")
    return itinerary


@app.patch("/itineraries/{itinerary_id}", response_model=ItineraryRead, tags=["itineraries"])
def update_itinerary(
    itinerary_id: UUID,
    payload: ItineraryUpdate,
    owner_id: OwnerId,
    database: Database,
    background_tasks: BackgroundTasks,
):
    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        return get_itinerary(itinerary_id, owner_id, database)

    assignments: list[str] = []
    values: list[object] = []
    for field in ("title", "stops", "visibility"):
        if field in changes:
            assignments.append(f"{field} = %s")
            value = changes[field]
            if field == "stops":
                value = Jsonb([stop.model_dump() for stop in (payload.stops or [])])
            elif field == "title" and isinstance(value, str):
                value = value.strip()
            values.append(value)
    values.extend([itinerary_id, owner_id])
    itinerary = database.execute(
        f"""
        UPDATE itineraries SET {', '.join(assignments)}, updated_at = NOW()
        WHERE id = %s AND owner_id = %s
        RETURNING id, owner_id, title, stops, visibility, created_at, updated_at
        """,
        values,
    ).fetchone()
    if not itinerary:
        raise HTTPException(status_code=404, detail="Itinerary not found")
    background_tasks.add_task(
        publish_event,
        "itinerary.updated",
        {"itinerary_id": str(itinerary_id), "owner_id": str(owner_id)},
    )
    return itinerary


@app.delete("/itineraries/{itinerary_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["itineraries"])
def delete_itinerary(
    itinerary_id: UUID,
    owner_id: OwnerId,
    database: Database,
    background_tasks: BackgroundTasks,
) -> Response:
    deleted = database.execute(
        "DELETE FROM itineraries WHERE id = %s AND owner_id = %s RETURNING id",
        (itinerary_id, owner_id),
    ).fetchone()
    if not deleted:
        raise HTTPException(status_code=404, detail="Itinerary not found")
    background_tasks.add_task(
        publish_event,
        "itinerary.deleted",
        {"itinerary_id": str(itinerary_id), "owner_id": str(owner_id)},
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.get("/public/itineraries/{itinerary_id}", response_model=ItineraryRead, tags=["sharing"])
def get_public_itinerary(itinerary_id: UUID, database: Database):
    itinerary = database.execute(
        """
        SELECT id, owner_id, title, stops, visibility, created_at, updated_at
        FROM itineraries WHERE id = %s AND visibility = 'public'
        """,
        (itinerary_id,),
    ).fetchone()
    if not itinerary:
        raise HTTPException(status_code=404, detail="Public itinerary not found")
    return itinerary

