import asyncio
import logging

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

logger = logging.getLogger("duosearch")


async def run_bot():
    if not settings.BOT_TOKEN:
        logger.warning("BOT_TOKEN is empty, skipping bot start")
        return

    logging.basicConfig(level=logging.INFO, force=True)
    logger.info("Starting Duosearch bot...")
    try:
        bot = Bot(token=settings.BOT_TOKEN)
        me = await bot.get_me()
        logger.info("Bot connected: @%s (ID: %d)", me.username or "?", me.id)
    except Exception as e:
        logger.error("Failed to connect bot: %s", e, exc_info=True)
        return
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
    try:
        await dp.start_polling(bot)
    except Exception as e:
        logger.error("Bot polling error: %s", e, exc_info=True)


async def main():
    logging.basicConfig(level=logging.INFO)
    logging.getLogger("aiogram.event").setLevel(logging.INFO)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    await run_bot()


if __name__ == "__main__":
    asyncio.run(main())
