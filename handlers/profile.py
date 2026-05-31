import logging
from aiogram import Router, F, Bot
from aiogram.filters import Command
from aiogram.types import Message, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from sqlalchemy.ext.asyncio import AsyncSession
from states.registration import RegistrationState

from keyboards.ranks import RANKS, has_roles, get_game_ranks
from keyboards.games import get_all_game_keys, get_game_roles
from services.user_service import get_user, upsert_user
from utils.constants import LANGS, REGIONS, esc as _esc

router = Router()
logger = logging.getLogger("duosearch.profile")


class EditState(StatesGroup):
    name = State()
    age = State()
    gender = State()
    languages = State()
    region = State()
    games = State()
    game_ranks = State()


def _format_profile_text(user) -> str:
    if not user:
        return "Ошибка"
    name_esc = _esc(user.name)
    lines = [
        f"📋 <b>Твой профиль</b>\n",
        f"👤 {name_esc}, {user.age} лет",
        f"{'👨' if user.gender == 'M' else '👩'} Пол: {user.gender}",
        f"🌍 Сервер: {user.region.upper()}",
        f"🗣 Языки: {user.language}\n",
    ]

    for game_key, profile in user.games.items():
        display = _esc(RANKS.get(game_key, {}).get("display", game_key))
        if profile.roles:
            roles_text = "\n".join(f"  • {_esc(role)}: {_esc(rank)}" for role, rank in profile.roles.items())
            lines.append(f"🎮 {display}:\n{roles_text}")
        elif profile.rank:
            lines.append(f"🎮 {display}: {_esc(profile.rank)}")

    lines.append("\nНажми «Редактировать» чтобы изменить профиль.")
    return "\n".join(lines)


def _profile_kb():
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="✏️ Редактировать", callback_data="profile_edit"),
            InlineKeyboardButton(text="🔄 Перерегистрация", callback_data="profile_reregister"),
        ]
    ])


async def show_profile(message: Message, session: AsyncSession):
    user = await get_user(session, message.from_user.id)
    if not user:
        await message.answer("Ты ещё не зарегистрирован. Нажми /start")
        return
    text = _format_profile_text(user)
    await message.answer(text, reply_markup=_profile_kb(), parse_mode="HTML")


@router.message(Command("profile"))
async def profile_handler(message: Message, session: AsyncSession):
    await show_profile(message, session)


@router.callback_query(F.data == "profile_reregister")
async def reregister(call: CallbackQuery, state: FSMContext):
    await state.clear()
    await call.message.answer("Пройди регистрацию заново. Нажми /start")
    await call.answer()


@router.callback_query(F.data == "profile_edit")
async def edit_profile(call: CallbackQuery, state: FSMContext):
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="👤 Имя", callback_data="edit_name")],
        [InlineKeyboardButton(text="🎂 Возраст", callback_data="edit_age")],
        [InlineKeyboardButton(text="🚻 Пол", callback_data="edit_gender")],
        [InlineKeyboardButton(text="🗣 Языки", callback_data="edit_langs")],
        [InlineKeyboardButton(text="🌍 Сервер", callback_data="edit_region")],
        [InlineKeyboardButton(text="🎮 Игры", callback_data="edit_games")],
        [InlineKeyboardButton(text="❌ Отмена", callback_data="edit_cancel")],
    ])
    await call.message.answer("Что хочешь изменить?", reply_markup=kb)
    await call.answer()


@router.callback_query(F.data == "edit_cancel")
async def edit_cancel(call: CallbackQuery, state: FSMContext):
    await state.clear()
    await call.message.answer("Отменено.")
    await call.answer()


# --------------- EDIT HANDLERS ---------------

@router.callback_query(F.data == "edit_name")
async def edit_name(call: CallbackQuery, state: FSMContext):
    await state.set_state(EditState.name)
    # Delete the "Что хочешь изменить?" message
    try:
        await call.message.delete()
    except Exception:
        pass
    msg = await call.message.answer("Введи новое имя:")
    await state.update_data(question_msg_id=msg.message_id)
    await call.answer()


@router.message(EditState.name)
async def save_name(message: Message, state: FSMContext, session: AsyncSession, bot: Bot):
    name = message.text.strip()
    if len(name) < 2:
        await message.answer("Имя должно быть хотя бы 2 символа")
        return
    if len(name) > 50:
        await message.answer("Слишком длинное имя (максимум 50 символов)")
        return

    bad_words = ["мат", "бляд", "хуй", "пизд", "еба", "fuck", "shit", "bitch", "asshole"]
    if any(w in name.lower() for w in bad_words):
        await message.answer("Используй нормальное имя!")
        return

    # Delete the "Введи новое имя:" question
    data = await state.get_data()
    qid = data.get("question_msg_id")
    if qid:
        try:
            await bot.delete_message(chat_id=message.chat.id, message_id=qid)
        except Exception as e:
            logger.warning("save_name: failed to delete msg %s: %s", qid, e)

    user = await get_user(session, message.from_user.id)
    if user:
        updated = await upsert_user(
            session=session, telegram_id=message.from_user.id, name=name,
            age=user.age, gender=user.gender, language=user.language,
            region=user.region, looking_for=user.looking_for, games=user.games
        )
        await state.clear()
        await message.answer(f"Имя обновлено: {name}")
        await message.answer(_format_profile_text(updated), reply_markup=_profile_kb(), parse_mode="HTML")
    else:
        await message.answer("Ошибка: пользователь не найден. Нажми /start")


@router.callback_query(F.data == "edit_age")
async def edit_age(call: CallbackQuery, state: FSMContext):
    await state.set_state(EditState.age)
    # Delete the "Что хочешь изменить?" message
    try:
        await call.message.delete()
    except Exception:
        pass
    msg = await call.message.answer("Сколько тебе лет?")
    await state.update_data(question_msg_id=msg.message_id)
    await call.answer()


@router.message(EditState.age)
async def save_age(message: Message, state: FSMContext, session: AsyncSession, bot: Bot):
    if not message.text.isdigit():
        await message.answer("Введи число")
        return
    age = int(message.text)
    if age < 14 or age > 99:
        await message.answer("Возраст от 14 до 99")
        return

    # Delete the "Сколько тебе лет?" question
    data = await state.get_data()
    qid = data.get("question_msg_id")
    if qid:
        try:
            await bot.delete_message(chat_id=message.chat.id, message_id=qid)
        except Exception as e:
            logger.warning("save_age: failed to delete msg %s: %s", qid, e)

    user = await get_user(session, message.from_user.id)
    if user:
        updated = await upsert_user(
            session=session, telegram_id=message.from_user.id, name=user.name,
            age=age, gender=user.gender, language=user.language,
            region=user.region, looking_for=user.looking_for, games=user.games
        )
        await state.clear()
        await message.answer(f"Возраст обновлен: {age}")
        await message.answer(_format_profile_text(updated), reply_markup=_profile_kb(), parse_mode="HTML")
    else:
        await message.answer("Ошибка: пользователь не найден. Нажми /start")


@router.callback_query(F.data == "edit_gender")
async def edit_gender(call: CallbackQuery, state: FSMContext):
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="👨 Парень", callback_data="edit_gender_M")],
        [InlineKeyboardButton(text="👩 Девушка", callback_data="edit_gender_F")],
    ])
    await state.set_state(EditState.gender)
    await call.message.answer("Выбери пол:", reply_markup=kb)
    await call.answer()


@router.callback_query(F.data.regexp(r"^edit_gender_[MF]$"), EditState.gender)
async def save_gender(call: CallbackQuery, state: FSMContext, session: AsyncSession):
    gender = call.data.split("_")[-1]
    # Delete the "Выбери пол:" question
    try:
        await call.message.delete()
    except Exception:
        pass
    user = await get_user(session, call.from_user.id)
    if user:
        updated = await upsert_user(
            session=session, telegram_id=call.from_user.id, name=user.name,
            age=user.age, gender=gender, language=user.language,
            region=user.region, looking_for=user.looking_for, games=user.games
        )
        await state.clear()
        await call.message.answer(f"Пол обновлён")
        await call.message.answer(_format_profile_text(updated), reply_markup=_profile_kb(), parse_mode="HTML")
    else:
        await call.message.answer("Ошибка: пользователь не найден. Нажми /start")
    await call.answer()


@router.callback_query(F.data == "edit_langs")
async def edit_langs(call: CallbackQuery, state: FSMContext, session: AsyncSession):
    await state.set_state(EditState.languages)
    # Delete the "Что хочешь изменить?" message
    try:
        await call.message.delete()
    except Exception:
        pass
    user = await get_user(session, call.from_user.id)
    current_langs = user.language.split(",") if user else []
    await state.update_data(selected_langs=current_langs)

    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text=f"{v}", callback_data=f"edit_lng_{lang}")]
        for lang, v in LANGS.items()
    ])
    for btn_row in kb.inline_keyboard:
        for btn in btn_row:
            lang = btn.callback_data.split("_")[-1]
            if lang in current_langs:
                btn.text += " ✅"
    kb.inline_keyboard.append([InlineKeyboardButton(text="Далее ➡", callback_data="edit_lng_done")])
    await call.message.answer("Выбери языки:", reply_markup=kb)
    await call.answer()


@router.callback_query(F.data.regexp(r"^edit_lng_[a-z]{2}$"), EditState.languages)
async def toggle_lang(call: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    selected = set(data.get("selected_langs", []))
    lang = call.data.split("_")[-1]

    if lang in selected:
        selected.remove(lang)
    else:
        selected.add(lang)
    await state.update_data(selected_langs=list(selected))

    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text=f"{v}", callback_data=f"edit_lng_{lang}")]
        for lang, v in LANGS.items()
    ])
    for btn_row in kb.inline_keyboard:
        for btn in btn_row:
            l = btn.callback_data.split("_")[-1]
            if l in selected:
                btn.text += " ✅"
    kb.inline_keyboard.append([InlineKeyboardButton(text="Далее ➡", callback_data="edit_lng_done")])
    await call.message.edit_reply_markup(reply_markup=kb)
    await call.answer()


@router.callback_query(F.data == "edit_lng_done", EditState.languages)
async def save_langs(call: CallbackQuery, state: FSMContext, session: AsyncSession):
    data = await state.get_data()
    selected = data.get("selected_langs", [])
    if not selected:
        await call.answer("Выбери хотя бы один язык", show_alert=True)
        return

    # Delete the "Выбери языки:" question
    try:
        await call.message.delete()
    except Exception:
        pass

    user = await get_user(session, call.from_user.id)
    if user:
        updated = await upsert_user(
            session=session, telegram_id=call.from_user.id, name=user.name,
            age=user.age, gender=user.gender, language=",".join(selected),
            region=user.region, looking_for=user.looking_for, games=user.games
        )
        await state.clear()
        await call.message.answer(f"Языки обновлены: {', '.join(selected)}")
        await call.message.answer(_format_profile_text(updated), reply_markup=_profile_kb(), parse_mode="HTML")
    else:
        await call.message.answer("Ошибка: пользователь не найден. Нажми /start")
    await call.answer()


@router.callback_query(F.data == "edit_region")
async def edit_region(call: CallbackQuery, state: FSMContext):
    await state.set_state(EditState.region)
    # Delete the "Что хочешь изменить?" message
    try:
        await call.message.delete()
    except Exception:
        pass
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text=t.split()[-1] if " " in t else t, callback_data=f"edit_region_{c}")]
        for c, t in REGIONS.items()
    ])
    await call.message.answer("Выбери сервер:", reply_markup=kb)
    await call.answer()


@router.callback_query(F.data.startswith("edit_region_"), EditState.region)
async def save_region(call: CallbackQuery, state: FSMContext, session: AsyncSession):
    region = call.data.split("_")[-1]
    # Delete the "Выбери сервер:" question
    try:
        await call.message.delete()
    except Exception:
        pass
    user = await get_user(session, call.from_user.id)
    if user:
        updated = await upsert_user(
            session=session, telegram_id=call.from_user.id, name=user.name,
            age=user.age, gender=user.gender, language=user.language,
            region=region, looking_for=user.looking_for, games=user.games
        )
        await state.clear()
        await call.message.answer(f"Регион обновлён")
        await call.message.answer(_format_profile_text(updated), reply_markup=_profile_kb(), parse_mode="HTML")
    else:
        await call.message.answer("Ошибка: пользователь не найден. Нажми /start")
    await call.answer()


# --------------- EDIT GAMES ---------------

@router.callback_query(F.data == "edit_games")
async def edit_games(call: CallbackQuery, state: FSMContext, session: AsyncSession):
    """Redirect to registration game flow to re-select games from scratch"""
    user = await get_user(session, call.from_user.id)
    if not user:
        await call.answer("Пользователь не найден", show_alert=True)
        return

    # Delete the "Что хочешь изменить?" message
    try:
        await call.message.delete()
    except Exception:
        pass

    # Save current user data to state for later update
    # Save both original fields (for registration flow) and edit_ fields (for finalize)
    await state.update_data(
        edit_mode=True,
        # Original fields (used by registration flow)
        name=user.name,
        age=user.age,
        gender=user.gender,
        languages=user.language.split(","),
        region=user.region,
        # Edit fields (used by finalize to preserve user data)
        edit_name=user.name,
        edit_age=user.age,
        edit_gender=user.gender,
        edit_language=user.language,
        edit_region=user.region,
        edit_looking_for=user.looking_for,
        games=[]  # Start with empty games list
    )

    # Import registration keyboard function
    from handlers.registration import _games_keyboard

    # Set state to games selection (same as registration)
    await state.set_state(RegistrationState.games)
    await call.message.answer(
        "🎮 Перенастройка игр.\n\nВыбери свои игры:",
        reply_markup=_games_keyboard([])
    )
    await call.answer()
