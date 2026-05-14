import logging

from aiogram import Bot
from aiogram.exceptions import TelegramBadRequest, TelegramForbiddenError
from aiogram.types import ErrorEvent
from config import settings

logger = logging.getLogger("duosearch.errors")


async def on_error(event: ErrorEvent, bot: Bot):
    """Global error handler — ловит все исключения из хендлеров и мидлварей."""
    e = event.exception

    if isinstance(e, TelegramBadRequest):
        logger.warning("TelegramBadRequest: %s", e)
        return

    if isinstance(e, TelegramForbiddenError):
        user_id = None
        if event.update.message:
            user_id = event.update.message.from_user.id
        elif event.update.callback_query:
            user_id = event.update.callback_query.from_user.id
        logger.info("Bot blocked by user_id=%s", user_id)
        return

    logger.error("Unhandled exception in update_id=%s", event.update.update_id, exc_info=e)

    # Уведомление админам
    err_msg = str(e).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    for admin_id in settings.admin_ids_list:
        try:
            await bot.send_message(
                admin_id,
                f"<b>Ошибка в боте</b>\n"
                f"<code>{type(e).__name__}: {err_msg}</code>",
                parse_mode="HTML",
            )
        except Exception:
            pass
