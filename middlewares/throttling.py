import time
import logging

from aiogram import BaseMiddleware
from aiogram.types import Message, CallbackQuery
from typing import Callable, Dict, Any, Awaitable

logger = logging.getLogger("duosearch.throttle")


class ThrottlingMiddleware(BaseMiddleware):
    """Rate limiting: 0.5s между сообщениями, 1s между callback для одного юзера."""

    def __init__(self, rate: float = 0.5, callback_rate: float = 1.0):
        self.rate = rate
        self.callback_rate = callback_rate
        self._messages: Dict[int, float] = {}
        self._callbacks: Dict[int, float] = {}

    async def __call__(
        self,
        handler: Callable,
        event: Any,
        data: Dict[str, Any],
    ) -> Awaitable:
        if isinstance(event, Message):
            user_id = event.from_user.id
            now = time.time()
            last = self._messages.get(user_id, 0)
            elapsed = now - last
            if elapsed < self.rate:
                logger.debug("Throttled message: user=%s wait=%.2fs", user_id, self.rate - elapsed)
                return
            self._messages[user_id] = now

        elif isinstance(event, CallbackQuery):
            user_id = event.from_user.id
            now = time.time()
            last = self._callbacks.get(user_id, 0)
            elapsed = now - last
            if elapsed < self.callback_rate:
                logger.debug("Throttled callback: user=%s wait=%.2fs", user_id, self.callback_rate - elapsed)
                await event.answer()
                return
            self._callbacks[user_id] = now

        return await handler(event, data)
