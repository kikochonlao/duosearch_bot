from aiogram import Router, F
from aiogram.types import Message

from services.user_service import create_user

router = Router()


@router.message(F.text == "/start")
async def start_handler(message: Message):
    user = await UserService.get_or_create_user(
        telegram_id=message.from_user.id,
        username=message.from_user.username
    )

    await message.answer(
        f"👋 Добро пожаловать в Duosearch!\n"
        f"Ты зарегистрирован в системе.\n"
        f"ID: {user.id}"
    )
