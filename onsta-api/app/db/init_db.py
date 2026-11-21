import asyncio

from sqlalchemy import text

from app.db.database import engine


async def main() -> None:
    required_tables = {"users", "roles", "clinic_applications", "clinic_application_documents"}
    async with engine.connect() as connection:
        rows = await connection.execute(text("""
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        """))
        present = set(rows.scalars().all())
    await engine.dispose()
    missing = sorted(required_tables - present)
    if missing:
        raise SystemExit(
            "The full standalone schema is not installed. In pgAdmin, run "
            "app/db/standalone_schema.sql against the new, empty onsta_platform_db. "
            f"Missing tables: {', '.join(missing)}"
        )
    print("Full standalone schema is present. No tables were created or changed.")


if __name__ == "__main__":
    asyncio.run(main())
