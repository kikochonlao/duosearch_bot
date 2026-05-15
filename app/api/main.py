import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import asyncio
import logging
from contextlib import asynccontextmanager
from logging.handlers import RotatingFileHandler

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from aiogram import Bot, Dispatcher

from config import settings
from db.base import async_session_maker, engine, Base
from db.models import *
from middlewares.db import DbSessionMiddleware
from middlewares.admin import AdminMiddleware
from middlewares.throttling import ThrottlingMiddleware
from handlers import registration, feed, profile, matches, help_handler, moderation, stats, admin, chat, donate
from handlers.errors import on_error
from keyboards import games, ranks, roles
from app.api.routers import auth, profile as api_profile, discover, matches as api_matches, chat as api_chat, games as api_games

logger = logging.getLogger("duosearch")
bot_task = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global bot_task

    logging.basicConfig(level=logging.INFO)
    logging.getLogger("aiogram.event").setLevel(logging.INFO)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

    # Create DB tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Start bot polling in background
    if settings.BOT_TOKEN:
        bot = Bot(token=settings.BOT_TOKEN)
        dp = Dispatcher()

        dp.update.middleware(DbSessionMiddleware(async_session_maker))
        dp.update.middleware(AdminMiddleware())
        dp.message.middleware(ThrottlingMiddleware())

        dp.errors.register(on_error)
        dp.include_router(registration.router)
        dp.include_router(feed.router)
        dp.include_router(profile.router)
        dp.include_router(matches.router)
        dp.include_router(moderation.router)
        dp.include_router(stats.router)
        dp.include_router(admin.router)
        dp.include_router(help_handler.router)
        dp.include_router(donate.router)
        dp.include_router(chat.router)

        logger.info("Starting bot polling in background...")
        bot_task = asyncio.create_task(dp.start_polling(bot))
    else:
        logger.warning("BOT_TOKEN not set, bot polling disabled")

    yield

    if bot_task:
        bot_task.cancel()
        try:
            await bot_task
        except asyncio.CancelledError:
            pass


app = FastAPI(title="Duosearch Mini App", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(api_profile.router, prefix="/api/profile", tags=["profile"])
app.include_router(discover.router, prefix="/api/discover", tags=["discover"])
app.include_router(api_matches.router, prefix="/api/matches", tags=["matches"])
app.include_router(api_chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(api_games.router, prefix="/api/games", tags=["games"])


@app.get("/api/health")
async def health():
    return {"status": "ok"}
