import logging

from aiogram import BaseMiddleware

logger = logging.getLogger("duosearch.middleware")


class DbSessionMiddleware(BaseMiddleware):
    def __init__(self, sessionmaker):
        self.sessionmaker = sessionmaker

    async def __call__(self, handler, event, data):
        update_type = None
        user_id = None

        if hasattr(event, "message") and event.message:
            update_type = "message"
            user_id = event.message.from_user.id
        elif hasattr(event, "callback_query") and event.callback_query:
            update_type = "callback_query"
            user_id = event.callback_query.from_user.id

        logger.info("Update: %s | user=%s", update_type, user_id)

        async with self.sessionmaker() as session:
            data["session"] = session
            try:
                result = await handler(event, data)
                await session.commit()
                return result
            except Exception:
                await session.rollback()
                raise
