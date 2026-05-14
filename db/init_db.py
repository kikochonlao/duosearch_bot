import asyncio
from db.base import engine
from db.models.base import Base

# важно: импорт моделей
from db.models import *


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


if __name__ == "__main__":
    asyncio.run(init_db())