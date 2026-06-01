import html
import logging

from aiogram.exceptions import TelegramForbiddenError
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo

from bot_instance import get_bot

logger = logging.getLogger("duosearch.notifications")


def _keyboard(mini_app_url: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="Open DuoSearch", web_app=WebAppInfo(url=mini_app_url))]
    ])


def _log_send(ok: bool, kind: str, telegram_id: int, detail: str = ""):
    msg = f"{'Sent' if ok else 'Failed to send'} {kind} to {telegram_id}"
    if detail:
        msg += f": {detail}"
    if ok:
        logger.info(msg)
    else:
        logger.warning(msg)


async def notify_like(telegram_id: int, by_name: str, game: str):
    try:
        bot = get_bot()
        text = (
            f"❤️ <b>New like!</b>\n\n"
            f"{html.escape(by_name)} wants to play {game} with you!\n"
            f"Open DuoSearch to check them out."
        )
        await bot.send_message(telegram_id, text, parse_mode="HTML")
        _log_send(True, "like", telegram_id)
    except TelegramForbiddenError:
        _log_send(False, "like", telegram_id, "user blocked bot or never started it")
    except Exception as e:
        _log_send(False, "like", telegram_id, str(e))


async def notify_match(telegram_id: int, other_name: str, game: str, mini_app_url: str):
    try:
        bot = get_bot()
        text = (
            f"🎉 <b>It's a match!</b>\n\n"
            f"{html.escape(other_name)} also wants to play {game} with you!"
        )
        await bot.send_message(telegram_id, text, parse_mode="HTML", reply_markup=_keyboard(mini_app_url))
        _log_send(True, "match", telegram_id)
    except TelegramForbiddenError:
        _log_send(False, "match", telegram_id, "user blocked bot or never started it")
    except Exception as e:
        _log_send(False, "match", telegram_id, str(e))


async def notify_message(telegram_id: int, from_name: str, text_preview: str, mini_app_url: str):
    try:
        bot = get_bot()
        preview = html.escape(text_preview[:80])
        text = (
            f"💬 <b>New message</b> from {html.escape(from_name)}:\n\n"
            f"{preview}"
        )
        await bot.send_message(telegram_id, text, parse_mode="HTML", reply_markup=_keyboard(mini_app_url))
        _log_send(True, "message", telegram_id)
    except TelegramForbiddenError:
        _log_send(False, "message", telegram_id, "user blocked bot or never started it")
    except Exception as e:
        _log_send(False, "message", telegram_id, str(e))


async def notify_lobby_join(telegram_id: int, lobby_title: str, by_name: str, mini_app_url: str):
    try:
        bot = get_bot()
        text = (
            f"👋 <b>New member</b> in \"{html.escape(lobby_title)}\":\n\n"
            f"{html.escape(by_name)} joined the lobby."
        )
        await bot.send_message(telegram_id, text, parse_mode="HTML", reply_markup=_keyboard(mini_app_url))
        _log_send(True, "lobby_join", telegram_id)
    except TelegramForbiddenError:
        _log_send(False, "lobby_join", telegram_id, "user blocked bot or never started it")
    except Exception as e:
        _log_send(False, "lobby_join", telegram_id, str(e))


async def notify_lobby_approved(telegram_id: int, lobby_title: str, mini_app_url: str):
    try:
        bot = get_bot()
        text = (
            f"✅ <b>Approved!</b>\n\n"
            f"You've been approved to join \"{html.escape(lobby_title)}\"."
        )
        await bot.send_message(telegram_id, text, parse_mode="HTML", reply_markup=_keyboard(mini_app_url))
        _log_send(True, "lobby_approved", telegram_id)
    except TelegramForbiddenError:
        _log_send(False, "lobby_approved", telegram_id, "user blocked bot or never started it")
    except Exception as e:
        _log_send(False, "lobby_approved", telegram_id, str(e))
