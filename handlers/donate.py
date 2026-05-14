import logging
from aiogram import Router, F
from aiogram.filters import Command
from aiogram.types import (
    Message, CallbackQuery,
    LabeledPrice, PreCheckoutQuery
)
from aiogram.utils.keyboard import InlineKeyboardBuilder
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup

router = Router()
logger = logging.getLogger("duosearch.donate")

MIN_STARS = 25
MAX_STARS = 10000


class DonateState(StatesGroup):
    waiting_amount = State()


@router.message(Command("donate"))
async def donate_command(message: Message, state: FSMContext):
    """Handle /donate command"""
    logger.info("donate_command triggered by user %s", message.from_user.id)
    await state.set_state(DonateState.waiting_amount)
    await message.answer_sticker(
        sticker="CAACAgIAAxkBAAEDysBp_dzX5KNPQeFyLB6IfYBxw3eeBQACqKAAAj0v6EsKQVD5p40M5jsE"
    )
    await message.answer(
        "💜 <b>Поддержать Duosearch</b>\n\n"
        "Каждая звёздочка помогает Руру развивать проект, улучшать поиск и делать новые функции ✨\n\n"
        f"Минимальная сумма поддержки: {MIN_STARS} ⭐️\n\n"
        "Введи количество звёзд, которое хочешь отправить:",
        parse_mode="HTML"
    )


@router.callback_query(F.data == "menu_donate")
async def menu_donate(call: CallbackQuery, state: FSMContext):
    logger.info("menu_donate triggered by user %s", call.from_user.id)
    await call.message.answer_sticker(
        sticker="CAACAgIAAxkBAAEDysBp_dzX5KNPQeFyLB6IfYBxw3eeBQACqKAAAj0v6EsKQVD5p40M5jsE"
    )
    await call.message.answer(
        "💜 <b>Поддержать Duosearch</b>\n\n"
        "Каждая звёздочка помогает Руру развивать проект, улучшать поиск и делать новые функции ✨\n\n"
        f"Минимальная сумма поддержки: {MIN_STARS} ⭐️\n\n"
        "Введи количество звёзд, которое хочешь отправить:",
        parse_mode="HTML"
    )
    await state.set_state(DonateState.waiting_amount)
    await call.answer()


@router.message(DonateState.waiting_amount)
async def process_donate_amount(message: Message, state: FSMContext):
    text = message.text.strip()

    if not text.isdigit():
        await message.answer(f"Введи число (минимум {MIN_STARS} ⭐)")
        return

    amount = int(text)

    if amount < MIN_STARS:
        await message.answer(f"Минимум {MIN_STARS} ⭐. Попробуй ещё раз:")
        return

    if amount > MAX_STARS:
        await message.answer(f"Максимум {MAX_STARS} ⭐. Попробуй ещё раз:")
        return

    builder = InlineKeyboardBuilder()
    builder.button(text=f"⭐ Оплатить {amount} звёзд", pay=True)
    builder.button(text="❌ Отмена", callback_data="donate_cancel")
    builder.adjust(1)

    await message.answer_invoice(
        title="Поддержка Duosearch",
        description=f"Донат проекту — {amount} ⭐",
        payload=f"donate_{amount}",
        provider_token="",
        currency="XTR",
        prices=[LabeledPrice(label="XTR", amount=amount)],
        reply_markup=builder.as_markup()
    )

    await state.clear()


@router.callback_query(F.data == "donate_cancel", DonateState.waiting_amount)
async def cancel_donate(call: CallbackQuery, state: FSMContext):
    await state.clear()
    await call.message.answer("Донат отменён.")
    await call.answer()


@router.pre_checkout_query()
async def on_pre_checkout(pre_checkout_query: PreCheckoutQuery):
    await pre_checkout_query.answer(ok=True)


@router.message(F.successful_payment)
async def on_successful_payment(message: Message):
    payment = message.successful_payment
    amount = payment.invoice_payload.replace("donate_", "")

    await message.answer(
        f"Спасибо за поддержку! 💜\n\n"
        f"Ты задонатил <b>{amount} ⭐</b>!\n"
        f"Это очень помогает развитию Duosearch 🚀",
        parse_mode="HTML"
    )

    logger.info("Donation received: %s stars from user %s", amount, message.from_user.id)
