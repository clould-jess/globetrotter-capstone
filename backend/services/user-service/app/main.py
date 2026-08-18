import os
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID, uuid4

import psycopg
from fastapi import Depends, FastAPI, Header, HTTPException, Query, status
from psycopg.errors import UniqueViolation
from psycopg.rows import dict_row
from pydantic import BaseModel, ConfigDict, Field


DATABASE_URL = os.environ["DATABASE_URL"]


def connection():
    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as database:
        yield database


Database = Annotated[psycopg.Connection, Depends(connection)]
RequesterId = Annotated[UUID, Header(alias="X-User-ID")]
RequesterRole = Annotated[str, Header(alias="X-User-Role")]


class UserCreate(BaseModel):
    email: str = Field(min_length=5, max_length=254, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
    display_name: str = Field(min_length=2, max_length=80)


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    display_name: str
    role: Literal["user", "admin"]
    created_at: datetime


def initialise_database() -> None:
    with psycopg.connect(DATABASE_URL) as database:
        database.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
              id UUID PRIMARY KEY,
              email TEXT NOT NULL UNIQUE,
              display_name VARCHAR(80) NOT NULL,
              role VARCHAR(10) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialise_database()
    yield


app = FastAPI(
    title="Cameroon Project · User Service",
    version="2.0.0",
    lifespan=lifespan,
)


@app.get("/health", tags=["operations"])
def health(database: Database) -> dict[str, str]:
    database.execute("SELECT 1")
    return {"status": "ok", "service": "user-service"}


@app.post("/users", response_model=UserRead, status_code=status.HTTP_201_CREATED, tags=["users"])
def create_user(payload: UserCreate, database: Database):
    try:
        return database.execute(
            """
            INSERT INTO users (id, email, display_name)
            VALUES (%s, LOWER(%s), %s)
            RETURNING id, email, display_name, role, created_at
            """,
            (uuid4(), payload.email, payload.display_name.strip()),
        ).fetchone()
    except UniqueViolation as error:
        raise HTTPException(status_code=409, detail="A user already exists for this email") from error


@app.get("/users", response_model=list[UserRead], tags=["users"])
def list_users(
    database: Database,
    role: RequesterRole,
    limit: int = Query(default=25, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    if role != "admin":
        raise HTTPException(status_code=403, detail="Administrator role required")
    return database.execute(
        """
        SELECT id, email, display_name, role, created_at
        FROM users ORDER BY created_at DESC LIMIT %s OFFSET %s
        """,
        (limit, offset),
    ).fetchall()


@app.get("/users/{user_id}", response_model=UserRead, tags=["users"])
def get_user(
    user_id: UUID,
    database: Database,
    requester_id: RequesterId,
    role: RequesterRole,
):
    if requester_id != user_id and role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    user = database.execute(
        "SELECT id, email, display_name, role, created_at FROM users WHERE id = %s",
        (user_id,),
    ).fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
