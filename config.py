from pydantic import BaseModel
from dotenv import load_dotenv
import os

load_dotenv(dotenv_path=".env")


class Settings(BaseModel):
    BOT_TOKEN: str
    DATABASE_URL: str
    ADMIN_IDS: str = ""
    ECHO_SQL: bool = False
    MINI_APP_URL: str = "https://frontend-ivory-nine-61.vercel.app?v=2"

    @property
    def admin_ids_list(self) -> list[int]:
        return [int(x.strip()) for x in self.ADMIN_IDS.split(",") if x.strip().isdigit()]


settings = Settings(
    BOT_TOKEN=os.getenv("BOT_TOKEN", ""),
    DATABASE_URL=os.getenv("DATABASE_URL", "sqlite+aiosqlite:///db.sqlite3"),
    ADMIN_IDS=os.getenv("ADMIN_IDS", ""),
    ECHO_SQL=os.getenv("ECHO_SQL", "false").lower() in ("1", "true", "yes"),
    MINI_APP_URL=os.getenv("MINI_APP_URL", "https://frontend-ivory-nine-61.vercel.app?v=2"),
)

# Ensure async DSN for PostgreSQL
if settings.DATABASE_URL.startswith("postgresql://") and "+asyncpg" not in settings.DATABASE_URL:
    settings.DATABASE_URL = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
