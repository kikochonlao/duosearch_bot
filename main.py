import asyncio
import logging
from logging.handlers import RotatingFileHandler

from aiogram import Bot, Dispatcher

from config import settings
from db.base import async_session_maker, engine, Base
from db.models import *  # noqa: F401
from middlewares.db import DbSessionMiddleware
from middlewares.admin import AdminMiddleware
from middlewares.throttling import ThrottlingMiddleware
from handlers import registration, feed, profile, matches, help_handler, moderation, stats, admin, chat, donate
from handlers.errors import on_error

from keyboards import games, ranks, roles  # noqa: F401

# Console handler
console_handler = logging.StreamHandler()
console_handler.setFormatter(
    logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s")
)

# File handler with rotation (10 MB, 5 backups)
file_handler = RotatingFileHandler(
    "bot.log",
    maxBytes=10 * 1024 * 1024,
    backupCount=5,
    encoding="utf-8",
)
file_handler.setFormatter(
    logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s")
)

logging.basicConfig(
    level=logging.INFO,
    handlers=[console_handler, file_handler],
)

logger = logging.getLogger("duosearch")
logging.getLogger("aiogram.event").setLevel(logging.INFO)
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)


async def main():
    logger.info("Starting Duosearch bot...")
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

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables created/verified")

    logger.info("Bot is running. Press Ctrl+C to stop.")
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
