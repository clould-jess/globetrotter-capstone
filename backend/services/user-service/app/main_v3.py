import hashlib
import os
import secrets
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import Annotated, Literal
from urllib.parse import quote
from uuid import UUID, uuid4

import psycopg
from fastapi import Cookie, Depends, FastAPI, Header, HTTPException, Query, Response, status
from psycopg.errors import UniqueViolation
from psycopg.rows import dict_row
from pydantic import BaseModel, ConfigDict, Field


DATABASE_URL = os.environ["DATABASE_URL"]
SESSION_COOKIE = os.getenv("SESSION_COOKIE_NAME", "cameroon_session")
SESSION_TTL_HOURS = int(os.getenv("SESSION_TTL_HOURS", "720"))
SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", "true").lower() == "true"
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "").strip().lower()
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "")
ADMIN_DISPLAY_NAME = os.getenv("ADMIN_DISPLAY_NAME", "Administrateur").strip()

SCRYPT_N = 2**14
SCRYPT_R = 8
SCRYPT_P = 1


def connection():
    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as database:
        yield database


Database = Annotated[psycopg.Connection, Depends(connection)]
RequesterId = Annotated[UUID, Header(alias="X-User-ID")]
RequesterRole = Annotated[str, Header(alias="X-User-Role")]
SessionCookie = Annotated[str | None, Cookie(alias=SESSION_COOKIE)]


class AccountCreate(BaseModel):
    email: str = Field(min_length=5, max_length=254, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
    display_name: str = Field(min_length=2, max_length=80)
    password: str = Field(min_length=10, max_length=128)


class LoginRequest(BaseModel):
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=1, max_length=128)


class UserCreate(AccountCreate):
    role: Literal["user", "admin"] = "user"


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    display_name: str
    role: Literal["user", "admin"]
    status: Literal["active", "disabled"]
    created_at: datetime
    last_seen_at: datetime | None = None


class AdminStats(BaseModel):
    total_users: int
    active_users_24h: int
    new_users_7d: int
    admin_users: int


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(
        password.encode("utf-8"), salt=salt, n=SCRYPT_N, r=SCRYPT_R, p=SCRYPT_P, dklen=32
    )
    return f"scrypt${SCRYPT_N}${SCRYPT_R}${SCRYPT_P}${salt.hex()}${digest.hex()}"


def verify_password(password: str, encoded: str | None) -> bool:
    if not encoded:
        return False
    try:
        algorithm, n, r, p, salt, expected = encoded.split("$", 5)
        if algorithm != "scrypt":
            return False
        expected_bytes = bytes.fromhex(expected)
        actual = hashlib.scrypt(
            password.encode("utf-8"),
            salt=bytes.fromhex(salt),
            n=int(n),
            r=int(r),
            p=int(p),
            dklen=len(expected_bytes),
        )
        return secrets.compare_digest(actual, expected_bytes)
    except (ValueError, TypeError):
        return False


def session_digest(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=SESSION_COOKIE,
        value=token,
        max_age=SESSION_TTL_HOURS * 3600,
        httponly=True,
        secure=SESSION_COOKIE_SECURE,
        samesite="strict",
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(
        key=SESSION_COOKIE,
        httponly=True,
        secure=SESSION_COOKIE_SECURE,
        samesite="strict",
        path="/",
    )


def create_session(database: psycopg.Connection, user_id: UUID, response: Response) -> None:
    token = secrets.token_urlsafe(48)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=SESSION_TTL_HOURS)
    database.execute("DELETE FROM sessions WHERE expires_at <= NOW()")
    database.execute(
        "INSERT INTO sessions (token_digest, user_id, expires_at) VALUES (%s, %s, %s)",
        (session_digest(token), user_id, expires_at),
    )
    set_session_cookie(response, token)


def current_session_user(database: psycopg.Connection, token: str | None):
    if not token:
        return None
    user = database.execute(
        """
        SELECT users.id, users.email, users.display_name, users.role, users.status,
               users.created_at, users.last_seen_at
        FROM sessions
        JOIN users ON users.id = sessions.user_id
        WHERE sessions.token_digest = %s
          AND sessions.expires_at > NOW()
          AND users.status = 'active'
        """,
        (session_digest(token),),
    ).fetchone()
    if user:
        database.execute("UPDATE users SET last_seen_at = NOW() WHERE id = %s", (user["id"],))
        user["last_seen_at"] = datetime.now(timezone.utc)
    return user


def require_session(database: psycopg.Connection, token: str | None):
    user = current_session_user(database, token)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user


def require_admin(role: str) -> None:
    if role != "admin":
        raise HTTPException(status_code=403, detail="Administrator role required")


def initialise_database() -> None:
    with psycopg.connect(DATABASE_URL) as database:
        database.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
              id UUID PRIMARY KEY,
              email TEXT NOT NULL UNIQUE,
              display_name VARCHAR(80) NOT NULL,
              password_hash TEXT,
              role VARCHAR(10) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
              status VARCHAR(10) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              last_seen_at TIMESTAMPTZ
            )
            """
        )
        database.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT")
        database.execute(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(10) NOT NULL DEFAULT 'active'"
        )
        database.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ")
        database.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
              token_digest CHAR(64) PRIMARY KEY,
              user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              expires_at TIMESTAMPTZ NOT NULL
            )
            """
        )
        database.execute("CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id)")
        database.execute("CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at)")
        if ADMIN_EMAIL and ADMIN_PASSWORD:
            if len(ADMIN_PASSWORD) < 10 or ADMIN_PASSWORD.startswith("replace-with-"):
                raise RuntimeError("Set a unique administrator password of at least 10 characters")
            database.execute(
                """
                INSERT INTO users (id, email, display_name, password_hash, role, status)
                VALUES (%s, %s, %s, %s, 'admin', 'active')
                ON CONFLICT (email) DO NOTHING
                """,
                (uuid4(), ADMIN_EMAIL, ADMIN_DISPLAY_NAME, hash_password(ADMIN_PASSWORD)),
            )


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialise_database()
    yield


app = FastAPI(title="Cameroon Project · User Service", version="3.0.0", lifespan=lifespan)


@app.get("/health", tags=["operations"])
def health(database: Database) -> dict[str, str]:
    database.execute("SELECT 1")
    return {"status": "ok", "service": "user-service"}


@app.post("/auth/register", response_model=UserRead, status_code=status.HTTP_201_CREATED, tags=["auth"])
def register(payload: AccountCreate, response: Response, database: Database):
    try:
        user = database.execute(
            """
            INSERT INTO users (id, email, display_name, password_hash)
            VALUES (%s, LOWER(%s), %s, %s)
            RETURNING id, email, display_name, role, status, created_at, last_seen_at
            """,
            (uuid4(), payload.email.strip(), payload.display_name.strip(), hash_password(payload.password)),
        ).fetchone()
    except UniqueViolation as error:
        raise HTTPException(status_code=409, detail="An account already exists for this email") from error
    create_session(database, user["id"], response)
    return user


@app.post("/auth/login", response_model=UserRead, tags=["auth"])
def login(payload: LoginRequest, response: Response, database: Database):
    user = database.execute(
        """
        SELECT id, email, display_name, password_hash, role, status, created_at, last_seen_at
        FROM users WHERE email = LOWER(%s)
        """,
        (payload.email.strip(),),
    ).fetchone()
    if not user or user["status"] != "active" or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    create_session(database, user["id"], response)
    return user


@app.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT, tags=["auth"])
def logout(response: Response, database: Database, session: SessionCookie = None):
    if session:
        database.execute("DELETE FROM sessions WHERE token_digest = %s", (session_digest(session),))
    clear_session_cookie(response)


@app.get("/auth/session", response_model=UserRead, tags=["auth"])
def get_session(database: Database, session: SessionCookie = None):
    return require_session(database, session)


@app.get("/auth/verify", tags=["auth"])
def verify_session(response: Response, database: Database, session: SessionCookie = None):
    user = require_session(database, session)
    response.headers["X-User-ID"] = str(user["id"])
    response.headers["X-User-Role"] = user["role"]
    response.headers["X-User-Display-Name"] = quote(user["display_name"], safe="")
    response.headers["X-User-Name-Encoding"] = "percent-encoded-utf-8"
    return {"authenticated": True}


@app.post("/users", response_model=UserRead, status_code=status.HTTP_201_CREATED, tags=["users"])
def create_user(payload: UserCreate, database: Database, session: SessionCookie = None):
    require_admin(require_session(database, session)["role"])
    try:
        return database.execute(
            """
            INSERT INTO users (id, email, display_name, password_hash, role)
            VALUES (%s, LOWER(%s), %s, %s, %s)
            RETURNING id, email, display_name, role, status, created_at, last_seen_at
            """,
            (uuid4(), payload.email.strip(), payload.display_name.strip(), hash_password(payload.password), payload.role),
        ).fetchone()
    except UniqueViolation as error:
        raise HTTPException(status_code=409, detail="An account already exists for this email") from error


@app.get("/users", response_model=list[UserRead], tags=["users"])
def list_users(
    database: Database,
    session: SessionCookie = None,
    limit: int = Query(default=25, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    require_admin(require_session(database, session)["role"])
    return database.execute(
        """
        SELECT id, email, display_name, role, status, created_at, last_seen_at
        FROM users ORDER BY created_at DESC LIMIT %s OFFSET %s
        """,
        (limit, offset),
    ).fetchall()


@app.get("/users/{user_id}", response_model=UserRead, tags=["users"])
def get_user(user_id: UUID, database: Database, session: SessionCookie = None):
    requester = require_session(database, session)
    if requester["id"] != user_id and requester["role"] != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    user = database.execute(
        """
        SELECT id, email, display_name, role, status, created_at, last_seen_at
        FROM users WHERE id = %s
        """,
        (user_id,),
    ).fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.get("/admin/stats", response_model=AdminStats, tags=["admin"])
def admin_stats(database: Database, session: SessionCookie = None):
    require_admin(require_session(database, session)["role"])
    return database.execute(
        """
        SELECT
          COUNT(*)::int AS total_users,
          COUNT(*) FILTER (WHERE last_seen_at >= NOW() - INTERVAL '24 hours')::int AS active_users_24h,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS new_users_7d,
          COUNT(*) FILTER (WHERE role = 'admin')::int AS admin_users
        FROM users
        """
    ).fetchone()
