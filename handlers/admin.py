import logging
from aiogram import Router, F
from aiogram.types import Message, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import StatesGroup, State
from aiogram.exceptions import TelegramBadRequest
from sqlalchemy.ext.asyncio import AsyncSession

from db.repositories.admin_repo import AdminRepository
from keyboards.ranks import RANKS

router = Router()
logger = logging.getLogger("duosearch.admin")

ADMIN_PAGE_SIZE = 10


async def _safe_answer(call: CallbackQuery, text: str = None, show_alert: bool = False):
    try:
        await call.answer(text=text, show_alert=show_alert)
    except TelegramBadRequest:
        pass


class BroadcastState(StatesGroup):
    message = State()
    confirm = State()


@router.message(F.text.regexp(r"^/admin"))
async def admin_dashboard(message: Message, session: AsyncSession, is_admin: bool = False):
    logger.info("Admin handler triggered. is_admin=%s, user=%s", is_admin, message.from_user.id)
    if not is_admin:
        await message.answer("⛔ У тебя нет прав администратора.")
        return
    repo = AdminRepository(session)
    stats = await repo.get_stats()

    text = (
        f"🛡 <b>Админ-панель Duosearch</b>\n\n"
        f"👥 Пользователей: {stats['users']}\n"
        f"❤️ Лайков: {stats['likes']}\n"
        f"🤝 Матчей: {stats['matches']}\n"
        f"🚫 Блокировок: {stats['blocks']}\n"
        f"🚨 Жалоб: {stats['reports']}\n"
        f"⛔ Забанено: {stats['banned']}\n\n"
        f"Выбери действие:"
    )

    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="👥 Все пользователи", callback_data="admin_users"),
        ],
        [
            InlineKeyboardButton(text="📊 Статистика", callback_data="admin_stats"),
            InlineKeyboardButton(text="📢 Рассылка", callback_data="admin_broadcast"),
        ],
        [
            InlineKeyboardButton(text="⛔ Забанить", callback_data="admin_ban_input"),
            InlineKeyboardButton(text="✅ Разбанить", callback_data="admin_unban_input"),
        ],
    ])

    await message.answer(text, reply_markup=kb, parse_mode="HTML")


@router.callback_query(F.data == "admin_users")
async def admin_users(call: CallbackQuery, session: AsyncSession, is_admin: bool = False):
    if not is_admin:
        await _safe_answer(call, text="⛔ Нет прав.", show_alert=True)
        return
    await _safe_answer(call)
    await _show_users_page(call, session, 0)


async def _show_users_page(call, session: AsyncSession, offset: int):
    repo = AdminRepository(session)
    users = await repo.get_users(offset=offset, limit=ADMIN_PAGE_SIZE)
    total = await repo.get_users_count()

    if not users:
        await call.message.answer("Пользователей нет.")
        return

    lines = [f"👥 <b>Пользователи</b> ({offset + 1}-{min(offset + len(users), total)} из {total})\n"]

    for u in users:
        status = "⛔" if u.is_banned else "✅"
        games = ", ".join(u.get_games().keys()) if u.get_games() else "—"
        name_html = u.name.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        lines.append(
            f"{status} <b>ID {u.id}</b> | <code>{u.telegram_id}</code>\n"
            f"  {name_html}, {u.age} лет, {u.gender}\n"
            f"  🎮 {games}\n"
        )

    kb_rows = []
    if offset > 0:
        kb_rows.append([InlineKeyboardButton(text="⬅ Назад", callback_data=f"admin_users_{offset - ADMIN_PAGE_SIZE}")])
    if offset + ADMIN_PAGE_SIZE < total:
        kb_rows.append([InlineKeyboardButton(text="Вперёд ➡", callback_data=f"admin_users_{offset + ADMIN_PAGE_SIZE}")])

    kb = InlineKeyboardMarkup(inline_keyboard=kb_rows)

    text = "\n".join(lines)
    if len(text) > 4000:
        text = text[:3900] + "\n... (обрезано)"

    await call.message.answer(text, reply_markup=kb, parse_mode="HTML")


@router.callback_query(F.data.startswith("admin_users_"))
async def admin_users_page(call: CallbackQuery, session: AsyncSession, is_admin: bool = False):
    if not is_admin:
        await _safe_answer(call, text="⛔ Нет прав.", show_alert=True)
        return
    await _safe_answer(call)
    offset = int(call.data.replace("admin_users_", ""))
    await _show_users_page(call, session, offset)


@router.callback_query(F.data == "admin_stats")
async def admin_stats(call: CallbackQuery, session: AsyncSession, is_admin: bool = False):
    if not is_admin:
        await _safe_answer(call, text="⛔ Нет прав.", show_alert=True)
        return
    await _safe_answer(call)
    repo = AdminRepository(session)
    stats = await repo.get_stats()

    text = (
        f"📊 <b>Общая статистика</b>\n\n"
        f"👥 Пользователей: {stats['users']}\n"
        f"  ✅ Активных: {stats['users'] - stats['banned']}\n"
        f"  ⛔ Забанено: {stats['banned']}\n\n"
        f"❤️ Лайков: {stats['likes']}\n"
        f"🤝 Матчей: {stats['matches']}\n"
        f"🚫 Блокировок: {stats['blocks']}\n"
        f"🚨 Жалоб: {stats['reports']}\n\n"
    )

    if stats['users'] > 0:
        match_rate = (stats['matches'] / max(stats['likes'], 1)) * 100
        text += f"📈 Конверсия матчей: {match_rate:.1f}%\n"

    await call.message.answer(text, parse_mode="HTML")


@router.callback_query(F.data == "admin_ban_input")
async def admin_ban_input(call: CallbackQuery, is_admin: bool = False):
    if not is_admin:
        await _safe_answer(call, text="⛔ Нет прав.", show_alert=True)
        return
    await _safe_answer(call)
    await call.message.answer(
        "Используй команду для бана:\n\n"
        "<code>/ban 123456789</code>",
        parse_mode="HTML"
    )



@router.message(F.text.regexp(r"^/ban\s+(\d+)$"))
async def admin_ban_execute(message: Message, session: AsyncSession, is_admin: bool = False):
    if not is_admin:
        return

    telegram_id = int(message.text.split()[1])
    repo = AdminRepository(session)

    success = await repo.ban_user(telegram_id)
    if success:
        await message.answer(f"✅ Пользователь <code>{telegram_id}</code> забанен.", parse_mode="HTML")
        try:
            await message.bot.send_message(
                telegram_id,
                "⛔ <b>Ваш аккаунт заблокирован</b>\n\n"
                "Вы больше не можете пользоваться ботом Duosearch.\n"
                "По вопросам обратитесь к администрации.",
                parse_mode="HTML"
            )
        except Exception as e:
            logger.error("Failed to notify ban to %s: %s", telegram_id, e)
    else:
        await message.answer(f"❌ Пользователь <code>{telegram_id}</code> не найден.", parse_mode="HTML")


@router.callback_query(F.data == "admin_unban_input")
async def admin_unban_input(call: CallbackQuery, is_admin: bool = False):
    if not is_admin:
        await _safe_answer(call, text="⛔ Нет прав.", show_alert=True)
        return
    await _safe_answer(call)
    await call.message.answer(
        "Используй команду для разбана:\n\n"
        "<code>/unban 123456789</code>",
        parse_mode="HTML"
    )


@router.message(F.text.regexp(r"^/unban\s+(\d+)$"))
async def admin_unban_by_command(message: Message, session: AsyncSession, is_admin: bool = False):
    if not is_admin:
        await message.answer("⛔ У тебя нет прав администратора.")
        return

    telegram_id = int(message.text.split()[1])
    repo = AdminRepository(session)

    success = await repo.unban_user(telegram_id)
    if success:
        await message.answer(f"✅ Пользователь <code>{telegram_id}</code> разбанен.", parse_mode="HTML")
    else:
        await message.answer(f"❌ Пользователь <code>{telegram_id}</code> не найден.", parse_mode="HTML")


@router.callback_query(F.data == "admin_broadcast")
async def admin_broadcast_start(call: CallbackQuery, state: FSMContext, is_admin: bool = False):
    if not is_admin:
        await _safe_answer(call, text="⛔ Нет прав.", show_alert=True)
        return
    await _safe_answer(call)
    await state.set_state(BroadcastState.message)
    await call.message.answer(
        "📢 <b>Рассылка</b>\n\n"
        "Отправь текст сообщения для всех пользователей.\n"
        "Поддерживается HTML.\n\n"
        "Отправь /cancel для отмены.",
        parse_mode="HTML"
    )


@router.message(BroadcastState.message, F.text == "/cancel")
async def broadcast_cancel(message: Message, state: FSMContext):
    await state.clear()
    await message.answer("❌ Рассылка отменена.")


def _sanitize_html(text: str) -> str:
    allowed_tags = {"b", "i", "u", "s", "code", "pre", "a"}
    import re
    def _replace_tag(m):
        tag = m.group(1)
        if tag.lower() in allowed_tags:
            return m.group(0)
        return ""
    text = re.sub(r"</?(\w+)[^>]*>", _replace_tag, text)
    return text


@router.message(BroadcastState.message)
async def broadcast_preview(message: Message, state: FSMContext, session: AsyncSession, is_admin: bool = False):
    if not is_admin:
        return

    text = _sanitize_html(message.text)
    if len(text) > 4000:
        await message.answer("Сообщение слишком длинное (максимум 4000 символов).")
        return
    await state.update_data(broadcast_text=text)
    await state.set_state(BroadcastState.confirm)

    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="✅ Отправить всем", callback_data="broadcast_confirm"),
            InlineKeyboardButton(text="❌ Отмена", callback_data="broadcast_cancel"),
        ]
    ])

    await message.answer(
        f"📢 <b>Превью рассылки</b>\n\n{text}\n\n"
        f"Отправить это сообщение всем пользователям?",
        reply_markup=kb,
        parse_mode="HTML"
    )


@router.callback_query(F.data == "broadcast_confirm", BroadcastState.confirm)
async def broadcast_execute(call: CallbackQuery, state: FSMContext, session: AsyncSession, is_admin: bool = False):
    if not is_admin:
        await _safe_answer(call, text="⛔ Нет прав.", show_alert=True)
        return
    await _safe_answer(call)
    data = await state.get_data()
    text = data.get("broadcast_text", "")

    repo = AdminRepository(session)
    telegram_ids = await repo.get_all_active_telegram_ids()

    if not telegram_ids:
        await call.message.answer("❌ Нет активных пользователей для рассылки.")
        await state.clear()
        return

    success = 0
    failed = 0

    for tid in telegram_ids:
        try:
            await call.bot.send_message(tid, text, parse_mode="HTML")
            success += 1
        except Exception as e:
            logger.error("Broadcast to %s failed: %s", tid, e)
            failed += 1

    await call.message.answer(
        f"📢 <b>Рассылка завершена</b>\n\n"
        f"✅ Доставлено: {success}\n"
        f"❌ Ошибки: {failed}\n"
        f"👥 Всего: {len(telegram_ids)}",
        parse_mode="HTML"
    )

    await state.clear()


@router.callback_query(F.data == "broadcast_cancel", BroadcastState.confirm)
async def broadcast_cancel_cb(call: CallbackQuery, state: FSMContext, is_admin: bool = False):
    if not is_admin:
        await _safe_answer(call, text="⛔ Нет прав.", show_alert=True)
        return
    await _safe_answer(call)
    await state.clear()
    await call.message.answer("❌ Рассылка отменена.")
