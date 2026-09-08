import os
from contextlib import asynccontextmanager
from typing import Annotated, Literal

import psycopg
from fastapi import Depends, FastAPI, Header, HTTPException, Query, status
from psycopg.rows import dict_row
from pydantic import BaseModel, ConfigDict, Field


DATABASE_URL = os.environ["DATABASE_URL"]

SEED_DESTINATIONS = [
    (
        "mont-cameroun",
        "Mont Cameroun",
        "Sud-Ouest",
        "South-West",
        "Une ascension volcanique entre forêt dense et savane d’altitude.",
        "A volcanic ascent through rainforest and high savanna.",
        ["nature", "adventure"],
        "https://upload.wikimedia.org/wikipedia/commons/d/dc/Landscape_of_Mount_Cameroon.jpg",
        True,
    ),
    (
        "kribi",
        "Kribi & la Lobé",
        "Sud",
        "South",
        "Des plages dorées et les chutes de la Lobé au bord de l’Atlantique.",
        "Golden beaches and the Lobé Falls on the Atlantic shore.",
        ["beach", "nature"],
        "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Lob%C3%A9_beach_kribi_Cameroon.jpg/1280px-Lob%C3%A9_beach_kribi_Cameroon.jpg",
        True,
    ),
    (
        "ekom-nkam",
        "Ekom-Nkam",
        "Littoral",
        "Littoral",
        "Une chute spectaculaire enveloppée par la forêt tropicale.",
        "A spectacular waterfall wrapped in tropical forest.",
        ["nature", "adventure"],
        "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Drone_view_of_the_amazing_Ekom_Nkam_waterfall.jpg/1280px-Drone_view_of_the_amazing_Ekom_Nkam_waterfall.jpg",
        True,
    ),
    (
        "rhumsiki",
        "Rhumsiki",
        "Extrême-Nord",
        "Far North",
        "Les pitons rocheux des monts Mandara autour d’un village kapsiki.",
        "Mandara rock spires surrounding an iconic Kapsiki village.",
        ["nature", "culture", "adventure"],
        "https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Rhumsiki_with_Kapsiki_Peak_%28after_sunrise%29%2C_Far_North_Province_of_Cameroon.jpg/1280px-Rhumsiki_with_Kapsiki_Peak_%28after_sunrise%29%2C_Far_North_Province_of_Cameroon.jpg",
        True,
    ),
    (
        "foumban",
        "Foumban",
        "Ouest",
        "West",
        "Une capitale artistique où palais et ateliers racontent le royaume bamoun.",
        "An artistic capital where palaces and workshops tell the Bamoun story.",
        ["culture", "city"],
        "https://upload.wikimedia.org/wikipedia/commons/2/23/La_porte_principale_du_sultanat_de_Foumban.jpg",
        True,
    ),
    (
        "yaounde",
        "Yaoundé",
        "Centre",
        "Centre",
        "La capitale aux sept collines, entre musées, marchés et jardins.",
        "The seven-hill capital, shaped by museums, markets and gardens.",
        ["city", "culture"],
        "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Views_of_Yaounde_Cameroon_05.jpg/1280px-Views_of_Yaounde_Cameroon_05.jpg",
        True,
    ),
]

SEED_DESTINATIONS.extend(
    [
        (
            "waza", "Parc national de Waza", "Extrême-Nord", "Far North",
            "Un grand paysage de savane connu pour sa faune et ses oiseaux.",
            "A vast savanna landscape known for wildlife and birds.",
            ["nature", "adventure"],
            "https://commons.wikimedia.org/wiki/Special:Redirect/file/Elephants%20around%20tree%20in%20Waza%2C%20Cameroon.jpg?width=1280",
            True,
        ),
        (
            "benoue", "Parc national de la Bénoué", "Nord", "North",
            "Savanes, cours d’eau et observation de la faune entre Ngaoundéré et Garoua.",
            "Savanna, waterways and wildlife viewing between Ngaoundéré and Garoua.",
            ["nature", "adventure"],
            "https://commons.wikimedia.org/wiki/Special:Redirect/file/Parc%20National%20Benoue.jpg?width=1280",
            True,
        ),
        (
            "tello", "Chutes de Tello", "Adamaoua", "Adamawa",
            "Une cascade en rideau au cœur des hauteurs de l’Adamaoua.",
            "A curtain waterfall in the heart of the Adamawa highlands.",
            ["nature", "adventure"],
            "https://commons.wikimedia.org/wiki/Special:Redirect/file/Chutes%20Tello.jpg?width=1280",
            True,
        ),
        (
            "lake-awing", "Lac Awing", "Nord-Ouest", "North-West",
            "Un lac de cratère entouré par les collines verdoyantes des Grassfields.",
            "A crater lake surrounded by the green hills of the Grassfields.",
            ["nature", "culture", "adventure"],
            "https://commons.wikimedia.org/wiki/Special:Redirect/file/Lake%20Awing%202.jpg?width=1280",
            True,
        ),
        (
            "limbe", "Limbé & jardin botanique", "Sud-Ouest", "South-West",
            "Jardin tropical, plages volcaniques et vues sur le mont Cameroun.",
            "Tropical gardens, volcanic beaches and views of Mount Cameroon.",
            ["nature", "beach", "city"],
            "https://commons.wikimedia.org/wiki/Special:Redirect/file/Botanic%20garden%20limbe54.jpg?width=1280",
            True,
        ),
        (
            "dja", "Réserve de faune du Dja", "Est", "East",
            "Une vaste forêt du bassin du Congo presque encerclée par le fleuve Dja.",
            "A vast Congo Basin rainforest almost encircled by the Dja River.",
            ["nature", "adventure"],
            "https://commons.wikimedia.org/wiki/Special:Redirect/file/Dja%20River%20and%20pirogue.JPG?width=1280",
            True,
        ),
        (
            "lobeke", "Parc national de Lobéké", "Est", "East",
            "Clairières forestières et faune du bassin du Congo.",
            "Forest clearings and Congo Basin wildlife.",
            ["nature", "adventure"],
            "https://commons.wikimedia.org/wiki/Special:Redirect/file/Lob%C3%A9k%C3%A9%20buffalo.jpg?width=1280",
            True,
        ),
    ]
)


def connection():
    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as database:
        yield database


Database = Annotated[psycopg.Connection, Depends(connection)]
AdminRole = Annotated[str, Header(alias="X-User-Role")]


class DestinationCreate(BaseModel):
    slug: str = Field(min_length=2, max_length=80, pattern=r"^[a-z0-9-]+$")
    name: str = Field(min_length=2, max_length=120)
    region_fr: str = Field(min_length=2, max_length=80)
    region_en: str = Field(min_length=2, max_length=80)
    summary_fr: str = Field(min_length=10, max_length=500)
    summary_en: str = Field(min_length=10, max_length=500)
    categories: list[Literal["nature", "culture", "beach", "adventure", "city"]] = Field(
        min_length=1, max_length=5
    )
    image_url: str = Field(min_length=10, max_length=1000)
    published: bool = False


class DestinationRead(DestinationCreate):
    model_config = ConfigDict(from_attributes=True)


class DestinationUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    region_fr: str | None = Field(default=None, min_length=2, max_length=80)
    region_en: str | None = Field(default=None, min_length=2, max_length=80)
    summary_fr: str | None = Field(default=None, min_length=10, max_length=500)
    summary_en: str | None = Field(default=None, min_length=10, max_length=500)
    categories: list[Literal["nature", "culture", "beach", "adventure", "city"]] | None = Field(
        default=None, min_length=1, max_length=5
    )
    image_url: str | None = Field(default=None, min_length=10, max_length=1000)
    published: bool | None = None


def initialise_database() -> None:
    with psycopg.connect(DATABASE_URL) as database:
        database.execute(
            """
            CREATE TABLE IF NOT EXISTS destinations (
              slug VARCHAR(80) PRIMARY KEY,
              name VARCHAR(120) NOT NULL,
              region_fr VARCHAR(80) NOT NULL,
              region_en VARCHAR(80) NOT NULL,
              summary_fr VARCHAR(500) NOT NULL,
              summary_en VARCHAR(500) NOT NULL,
              categories TEXT[] NOT NULL,
              image_url TEXT NOT NULL,
              published BOOLEAN NOT NULL DEFAULT FALSE,
              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
        with database.cursor() as cursor:
            cursor.executemany(
                """
                INSERT INTO destinations
                  (slug, name, region_fr, region_en, summary_fr, summary_en, categories, image_url, published)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (slug) DO NOTHING
                """,
                SEED_DESTINATIONS,
            )


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialise_database()
    yield


app = FastAPI(
    title="Cameroon Project · Discovery Service",
    version="2.0.0",
    lifespan=lifespan,
)


@app.get("/health", tags=["operations"])
def health(database: Database) -> dict[str, str]:
    database.execute("SELECT 1")
    return {"status": "ok", "service": "discovery-service"}


@app.get("/destinations", response_model=list[DestinationRead], tags=["discovery"])
def list_destinations(
    database: Database,
    query: str | None = Query(default=None, min_length=2, max_length=80),
    category: str | None = Query(default=None, pattern=r"^(nature|culture|beach|adventure|city)$"),
    limit: int = Query(default=24, ge=1, le=100),
):
    conditions = ["published = TRUE"]
    values: list[object] = []
    if query:
        conditions.append("(name ILIKE %s OR summary_fr ILIKE %s OR summary_en ILIKE %s)")
        search = f"%{query}%"
        values.extend([search, search, search])
    if category:
        conditions.append("%s = ANY(categories)")
        values.append(category)
    values.append(limit)
    return database.execute(
        f"""
        SELECT slug, name, region_fr, region_en, summary_fr, summary_en,
               categories, image_url, published
        FROM destinations WHERE {' AND '.join(conditions)}
        ORDER BY name LIMIT %s
        """,
        values,
    ).fetchall()


@app.get("/destinations/{slug}", response_model=DestinationRead, tags=["discovery"])
def get_destination(slug: str, database: Database):
    destination = database.execute(
        """
        SELECT slug, name, region_fr, region_en, summary_fr, summary_en,
               categories, image_url, published
        FROM destinations WHERE slug = %s AND published = TRUE
        """,
        (slug,),
    ).fetchone()
    if not destination:
        raise HTTPException(status_code=404, detail="Destination not found")
    return destination


@app.get("/recommendations", response_model=list[DestinationRead], tags=["recommendations"])
def recommendations(
    database: Database,
    interest: str = Query(pattern=r"^(nature|culture|beach|adventure|city)$"),
    pace: Literal["relaxed", "balanced", "active"] = "balanced",
):
    limit = {"relaxed": 2, "balanced": 3, "active": 4}[pace]
    return database.execute(
        """
        SELECT slug, name, region_fr, region_en, summary_fr, summary_en,
               categories, image_url, published
        FROM destinations WHERE published = TRUE
        ORDER BY CASE WHEN %s = ANY(categories) THEN 0 ELSE 1 END, name
        LIMIT %s
        """,
        (interest, limit),
    ).fetchall()


def require_admin(role: str) -> None:
    if role != "admin":
        raise HTTPException(status_code=403, detail="Administrator role required")


@app.get("/admin/destinations", response_model=list[DestinationRead], tags=["publishing"])
def list_admin_destinations(
    database: Database,
    role: AdminRole,
    limit: int = Query(default=100, ge=1, le=200),
):
    require_admin(role)
    return database.execute(
        """
        SELECT slug, name, region_fr, region_en, summary_fr, summary_en,
               categories, image_url, published
        FROM destinations
        ORDER BY name
        LIMIT %s
        """,
        (limit,),
    ).fetchall()


@app.post(
    "/admin/destinations",
    response_model=DestinationRead,
    status_code=status.HTTP_201_CREATED,
    tags=["publishing"],
)
def create_destination(payload: DestinationCreate, role: AdminRole, database: Database):
    require_admin(role)
    destination = database.execute(
        """
        INSERT INTO destinations
          (slug, name, region_fr, region_en, summary_fr, summary_en, categories, image_url, published)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (slug) DO NOTHING
        RETURNING slug, name, region_fr, region_en, summary_fr, summary_en,
                  categories, image_url, published
        """,
        (
            payload.slug,
            payload.name.strip(),
            payload.region_fr.strip(),
            payload.region_en.strip(),
            payload.summary_fr.strip(),
            payload.summary_en.strip(),
            payload.categories,
            payload.image_url,
            payload.published,
        ),
    ).fetchone()
    if not destination:
        raise HTTPException(status_code=409, detail="Destination slug already exists")
    return destination


@app.patch("/admin/destinations/{slug}", response_model=DestinationRead, tags=["publishing"])
def update_destination(
    slug: str,
    payload: DestinationUpdate,
    role: AdminRole,
    database: Database,
):
    require_admin(role)
    updates = payload.model_dump(exclude_unset=True, exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No destination fields supplied")
    allowed_columns = {
        "name", "region_fr", "region_en", "summary_fr", "summary_en",
        "categories", "image_url", "published",
    }
    assignments = [f"{column} = %s" for column in updates if column in allowed_columns]
    values = [updates[column].strip() if isinstance(updates[column], str) else updates[column] for column in updates]
    values.append(slug)
    destination = database.execute(
        f"""
        UPDATE destinations
        SET {', '.join(assignments)}, updated_at = NOW()
        WHERE slug = %s
        RETURNING slug, name, region_fr, region_en, summary_fr, summary_en,
                  categories, image_url, published
        """,
        values,
    ).fetchone()
    if not destination:
        raise HTTPException(status_code=404, detail="Destination not found")
    return destination


@app.post("/admin/destinations/{slug}/publish", response_model=DestinationRead, tags=["publishing"])
def publish_destination(slug: str, role: AdminRole, database: Database):
    require_admin(role)
    destination = database.execute(
        """
        UPDATE destinations SET published = TRUE, updated_at = NOW()
        WHERE slug = %s
        RETURNING slug, name, region_fr, region_en, summary_fr, summary_en,
                  categories, image_url, published
        """,
        (slug,),
    ).fetchone()
    if not destination:
        raise HTTPException(status_code=404, detail="Destination not found")
    return destination
