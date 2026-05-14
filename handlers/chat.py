import time
import logging
from aiogram import Router, F
from aiogram.types import Message, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.exceptions import TelegramBadRequest
from sqlalchemy.ext.asyncio import AsyncSession

from db.repositories.chat_repo import ChatRepository
from db.repositories.like_repo import LikeRepository

router = Router()
logger = logging.getLogger("duosearch.chat")

# Anti-spam для чата: не чаще 1 сообщения в 2 секунды на пару
_chat_throttle: dict[int, float] = {}


@router.callback_query(F.data.startswith("chat_start_"))
async def start_chat(call: CallbackQuery, session: AsyncSession):
    parts = call.data.split("_", 3)
    match_id = int(parts[2])
    other_tg_id = int(parts[3])

    await call.answer()

    chat_repo = ChatRepository(session)

    existing = await chat_repo.get_session_by_match(match_id)
    if existing and existing.is_active:
        await call.message.answer("💬 Чат уже активен! Отправь сообщение тиммейту.")
        return

    if existing and not existing.is_active:
        await call.message.answer("💬 Этот чат уже завершён. Начните заново через /matches.")
        return

    like_repo = LikeRepository(session)
    my_db_user = await like_repo.get_user_by_telegram(call.from_user.id)
    other_db_user = await like_repo.get_user_by_telegram(other_tg_id)

    if not my_db_user or not other_db_user:
        await call.message.answer("❌ Ошибка: пользователь не найден.")
        return

    cs = await chat_repo.create_session(match_id, my_db_user.id, other_db_user.id)

    my_msg = (
        f"💬 <b>Чат с тиммейтом открыт!</b>\n\n"
        f"Просто отправь сообщение — оно будет передано.\n"
        f"Для завершения чата используй /stop"
    )

    await call.message.answer(my_msg, parse_mode="HTML")

    them_msg = (
        f"💬 <b>Тиммейт хочет пообщаться!</b>\n\n"
        f"Чат открыт. Отправь сообщение — оно будет передано.\n"
        f"Для завершения чата используй /stop"
    )

    try:
        await call.bot.send_message(other_tg_id, them_msg, parse_mode="HTML")
    except Exception as e:
        logger.error("Failed to notify chat start to %s: %s", other_tg_id, e)


@router.message(F.text.regexp(r"^[^/]"))
async def forward_message(message: Message, session: AsyncSession):
    chat_repo = ChatRepository(session)
    like_repo = LikeRepository(session)

    my_db_user = await like_repo.get_user_by_telegram(message.from_user.id)
    if not my_db_user:
        return

    cs = await chat_repo.get_active_session(my_db_user.id)
    if not cs or not cs.is_active:
        return

    other_user = await chat_repo.get_other_user_by_session(cs.id, my_db_user.id)
    if not other_user:
        return

    now = time.time()
    last = _chat_throttle.get(message.from_user.id, 0)
    if now - last < 2.0:
        return
    _chat_throttle[message.from_user.id] = now

    try:
        safe_text = message.text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        await message.bot.send_message(other_user.telegram_id, safe_text, parse_mode="HTML")
    except Exception as e:
        logger.error("Failed to forward message to %s: %s", other_user.telegram_id, e)
        await message.answer("Не удалось доставить сообщение. Тиммейт мог завершить чат.")
        return

@router.message(F.text == "/stop")
async def stop_chat(message: Message, session: AsyncSession):
    chat_repo = ChatRepository(session)
    like_repo = LikeRepository(session)

    my_db_user = await like_repo.get_user_by_telegram(message.from_user.id)
    if not my_db_user:
        return

    cs = await chat_repo.get_active_session(my_db_user.id)
    if not cs or not cs.is_active:
        await message.answer("У вас нет активного чата.")
        return

    await chat_repo.close_session(cs.id)

    other_user = await chat_repo.get_other_user_by_session(cs.id, my_db_user.id)

    await message.answer(
        "Чат завершён. Чтобы обменяться контактами — используй /send_telegram"
    )

    if other_user:
        try:
            await message.bot.send_message(
                other_user.telegram_id,
                "Тиммейт завершил чат. Чтобы обменяться контактами — используй /send_telegram",
                parse_mode="HTML"
            )
        except Exception as e:
            logger.error("Failed to notify chat stop to %s: %s", other_user.telegram_id, e)


@router.message(F.text == "/send_telegram")
async def send_telegram(message: Message, session: AsyncSession):
    chat_repo = ChatRepository(session)
    like_repo = LikeRepository(session)

    my_db_user = await like_repo.get_user_by_telegram(message.from_user.id)
    if not my_db_user:
        return

    cs = await chat_repo.get_session(my_db_user.id)
    if not cs:
        await message.answer("У вас нет чата с этим тиммейтом.")
        return

    if cs.is_active:
        await message.answer("Сначала завершите чат командой /stop")
        return

    if cs.contacts_exchanged:
        await message.answer("Контакты уже обменены!")
        return

    await chat_repo.exchange_contacts(cs.id)

    other_user = await chat_repo.get_other_user_by_session(cs.id, my_db_user.id)
    if not other_user:
        return

    my_username = message.from_user.username or "не указан"

    try:
        chat = await message.bot.get_chat(other_user.telegram_id)
        other_username = chat.username or "не указан"
    except Exception:
        other_username = "не указан"

    exchange_msg = (
        f"Контакты обменены!\n\n"
        f"Твой контакт: <b>@{my_username}</b>\n"
        f"Контакт тиммейта: <b>@{other_username}</b>\n\n"
        f"Напишите друг другу в личные сообщения!"
    )

    await message.answer(exchange_msg, parse_mode="HTML")

    try:
        await message.bot.send_message(
            other_user.telegram_id,
            f"Контакты обменены!\n\n"
            f"Тиммейт хочет связаться!\n"
            f"Твой контакт: <b>@{other_username}</b>\n"
            f"Контакт тиммейта: <b>@{my_username}</b>\n\n"
            f"Напишите друг другу в личные сообщения!",
            parse_mode="HTML"
        )
    except Exception as e:
        logger.error("Failed to send exchange to %s: %s", other_user.telegram_id, e)
