from pathlib import Path
import sqlite3


ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "prisma" / "dev.db"
MIGRATION_PATH = ROOT / "prisma" / "migrations" / "20260721103000_init_sqlite" / "migration.sql"


def main() -> None:
    if DB_PATH.exists():
        print(f"SQLite database already exists: {DB_PATH}")
        return

    sql = MIGRATION_PATH.read_text(encoding="utf-8")
    connection = sqlite3.connect(DB_PATH)
    try:
        connection.executescript(sql)
        connection.commit()
    finally:
        connection.close()

    print(f"Created SQLite database: {DB_PATH}")


if __name__ == "__main__":
    main()
