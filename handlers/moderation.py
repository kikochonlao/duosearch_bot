import logging
from aiogram import Router, F
from aiogram.types import Message, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import StatesGroup, State
from sqlalchemy.ext.asyncio import AsyncSession

from db.repositories.report_repo import ReportRepository

router = Router()
logger = logging.getLogger("duosearch.moderation")

REPORT_REASONS = {
    "scam": "🚨 Мошенничество",
    "abuse": "🤬 Оскорбления",
    "spam": "📢 Спам",
    "fake": "🎭 Фейковый профиль",
    "other": "❓ Другое",
}


class ReportState(StatesGroup):
    reason = State()
    details = State()


@router.callback_query(F.data.startswith("report_"))
async def start_report(call: CallbackQuery, state: FSMContext):
    target_id = int(call.data.replace("report_", ""))
    await state.update_data(report_target_id=target_id)

    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text=desc, callback_data=f"report_reason_{key}")]
        for key, desc in REPORT_REASONS.items()
    ])

    await call.message.answer("Выбери причину жалобы:", reply_markup=kb)
    await state.set_state(ReportState.reason)
    await call.answer()


@router.callback_query(F.data.startswith("report_reason_"), ReportState.reason)
async def select_reason(call: CallbackQuery, state: FSMContext, session: AsyncSession):
    reason = call.data.replace("report_reason_", "")
    await state.update_data(report_reason=reason)

    data = await state.get_data()
    target_id = data.get("report_target_id")

    repo = ReportRepository(session)
    auto_ban, total = await repo.add_report(call.from_user.id, target_id, reason)

    if auto_ban:
        await call.message.answer(
            "⚠️ Пользователь заблокирован автоматически.\n"
            f"Жалоб: {total}/{ReportRepository.REPORT_THRESHOLD}"
        )
    elif total == -1:
        await call.message.answer(
            "⏳ Ты уже отправлял жалобу на этого пользователя.\n"
            "Повторная жалоба возможна через 30 секунд."
        )
    else:
        await call.message.answer(
            f"✅ Жалоба отправлена.\n"
            f"Жалоб на пользователя: {total}/{ReportRepository.REPORT_THRESHOLD}"
        )

    await state.clear()
    await call.answer()


@router.callback_query(F.data.startswith("block_"))
async def handle_block(call: CallbackQuery, session: AsyncSession):
    target_id = int(call.data.replace("block_", ""))

    repo = ReportRepository(session)
    success = await repo.block_user(call.from_user.id, target_id)

    if success:
        await call.message.answer("🚫 Пользователь заблокирован. Ты больше не увидишь его в фиде.")
    else:
        await call.message.answer("ℹ️ Этот пользователь уже заблокирован.")

    await call.answer()
