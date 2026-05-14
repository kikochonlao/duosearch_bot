import logging

from aiogram import BaseMiddleware
from aiogram.types import Update
from typing import Callable, Dict, Any

from config import settings

logger = logging.getLogger("duosearch.middleware")


class AdminMiddleware(BaseMiddleware):
    async def __call__(
        self,
        handler: Callable,
        event: Update,
        data: Dict[str, Any],
    ) -> Any:
        user = None
        if hasattr(event, "message") and event.message:
            user = event.message.from_user
        elif hasattr(event, "callback_query") and event.callback_query:
            user = event.callback_query.from_user

        if user:
            data["is_admin"] = user.id in settings.admin_ids_list
            data["admin_user"] = user

        return await handler(event, data)
