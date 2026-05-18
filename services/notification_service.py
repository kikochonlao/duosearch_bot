import html
import logging
from bot_instance import get_bot

logger = logging.getLogger("duosearch")


async def notify_like(telegram_id: int, by_name: str, game: str):
    try:
        bot = get_bot()
        text = (
            f"❤️ <b>New like!</b>\n\n"
            f"{html.escape(by_name)} wants to play {game} with you!\n"
            f"Open Duosearch to check them out."
        )
        await bot.send_message(telegram_id, text, parse_mode="HTML")
    except Exception as e:
        logger.warning("Failed to notify like to %s: %s", telegram_id, e)


async def notify_match(telegram_id: int, other_name: str, game: str, mini_app_url: str):
    try:
        bot = get_bot()
        text = (
            f"🎉 <b>It's a match!</b>\n\n"
            f"{html.escape(other_name)} also wants to play {game} with you!\n"
            f"<a href='{mini_app_url}'>Open chat</a> to start talking."
        )
        await bot.send_message(telegram_id, text, parse_mode="HTML")
    except Exception as e:
        logger.warning("Failed to notify match to %s: %s", telegram_id, e)


async def notify_message(telegram_id: int, from_name: str, text_preview: str, mini_app_url: str):
    try:
        bot = get_bot()
        preview = html.escape(text_preview[:80])
        text = (
            f"💬 <b>New message</b> from {html.escape(from_name)}:\n\n"
            f"{preview}\n\n"
            f"<a href='{mini_app_url}'>Open chat</a>"
        )
        await bot.send_message(telegram_id, text, parse_mode="HTML")
    except Exception as e:
        logger.warning("Failed to notify message to %s: %s", telegram_id, e)


async def notify_lobby_join(telegram_id: int, lobby_title: str, by_name: str, mini_app_url: str):
    try:
        bot = get_bot()
        text = (
            f"👋 <b>New member</b> in \"{html.escape(lobby_title)}\":\n\n"
            f"{html.escape(by_name)} joined the lobby.\n"
            f"<a href='{mini_app_url}'>Open lobby</a>"
        )
        await bot.send_message(telegram_id, text, parse_mode="HTML")
    except Exception as e:
        logger.warning("Failed to notify lobby join to %s: %s", telegram_id, e)


async def notify_lobby_approved(telegram_id: int, lobby_title: str, mini_app_url: str):
    try:
        bot = get_bot()
        text = (
            f"✅ <b>Approved!</b>\n\n"
            f"You've been approved to join \"{html.escape(lobby_title)}\".\n"
            f"<a href='{mini_app_url}'>Open lobby</a>"
        )
        await bot.send_message(telegram_id, text, parse_mode="HTML")
    except Exception as e:
        logger.warning("Failed to notify lobby approval to %s: %s", telegram_id, e)
