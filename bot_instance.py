from aiogram import Bot
from config import settings

_bot: Bot | None = None


async def init_bot() -> Bot:
    global _bot
    _bot = Bot(token=settings.BOT_TOKEN)
    me = await _bot.get_me()
    return _bot


def get_bot() -> Bot:
    if _bot is None:
        raise RuntimeError("Bot not initialized")
    return _bot
