import asyncio
import sys
from sqlalchemy import text
from db.base import engine, Base
from db.models import *


async def migrate():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        for stmt in [
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url VARCHAR",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS steam_id VARCHAR",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS blog TEXT",
        ]:
            try:
                await conn.execute(text(stmt))
                print(f"OK: {stmt}")
            except Exception as e:
                print(f"SKIP: {stmt} - {e}")
    print("Done")


if __name__ == "__main__":
    asyncio.run(migrate())
