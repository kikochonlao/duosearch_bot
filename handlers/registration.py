import logging
from aiogram import Router, F, Bot
from aiogram.types import Message, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from config import settings
from aiogram.fsm.context import FSMContext
from aiogram.exceptions import TelegramBadRequest
from sqlalchemy.ext.asyncio import AsyncSession

from states.registration import RegistrationState
from states.feed import FeedState
from keyboards.ranks import RANKS, get_game_ranks, has_roles, rank_per_role
from keyboards.games import get_game_roles
from services.user_service import upsert_user, get_user

router = Router()
logger = logging.getLogger("duosearch.registration")

MAIN_MENU = InlineKeyboardMarkup(inline_keyboard=[
    [InlineKeyboardButton(text="🚀 Открыть DuoSearch", web_app=WebAppInfo(url=settings.MINI_APP_URL))],
    [InlineKeyboardButton(text="🔍 Найти тиммейта", callback_data="menu_myfeed")],
    [InlineKeyboardButton(text="🤝 Мои матчи", callback_data="menu_matches")],
    [InlineKeyboardButton(text="👤 Профиль", callback_data="menu_profile")],
    [InlineKeyboardButton(text="💜 Поддержать проект", callback_data="menu_donate")],
    [InlineKeyboardButton(text="❓ Помощь", callback_data="menu_help")],
])

LANGS = {
    "ru": "🇷🇺 Русский",
    "en": "🇺🇸 English",
    "uk": "🇺🇦 Українська",
    "kz": "🇰🇿 Қазақша",
    "by": "🇧🇾 Беларуская",
    "uz": "🇺🇿 Oʻzbekcha",
}

GENDER_LABELS = {"M": "👨 Парень", "F": "👩 Девушка"}

REGIONS = {
    "cis": "🌍 СНГ",
    "eu": "🌍 Europe",
    "na": "🌎 North America",
    "asia": "🌏 Asia",
    "sa": "🌎 South America",
    "oce": "🏝️ Oceania",
}


async def safe_edit(call, **kwargs):
    try:
        await call.message.edit_reply_markup(**kwargs)
    except TelegramBadRequest:
        pass


def _role_cb_key(role: str) -> str:
    return role.lower().replace(" ", "_")


def _rank_cb_key(rank: str) -> str:
    return rank.replace(" ", "__")


def _rank_from_cb(cb: str) -> str:
    return cb.replace("__", " ")


def _esc(text: str) -> str:
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


# ---------------- PING (diagnostic) ----------------


@router.message(F.text == "/ping")
async def ping(message: Message):
    await message.answer("pong 🏓")


# ---------------- WELCOME ----------------

@router.message(F.text == "/start")
async def start(message: Message, state: FSMContext, session: AsyncSession):
    await state.clear()
    logger.info("User %s pressed /start", message.from_user.id)

    existing_user = await get_user(session, message.from_user.id)
    if existing_user:
        if existing_user.is_banned:
            await message.answer("⛔ Ваш аккаунт заблокирован.")
            return

        name_esc = existing_user.name.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        await message.answer(
            f"👋 Привет, {name_esc}!\n\n"
            f"Ты уже зарегистрирован. Что будем делать?",
            reply_markup=MAIN_MENU,
            parse_mode="HTML"
        )
        return

    await message.answer_sticker(
        sticker="CAACAgIAAxkBAAEDrexp94Mz3Psrrl3aZ0J41PAMUmkIzQACNZsAAkUpuEs7WkT_bj-clzsE"
    )

    await message.answer(
        "🎮 Хей-хей! Я Руру~ 🐾\n\n"
        "Добро пожаловать в Duosearch!\n"
        "Я помогу тебе найти идеальных тиммейтов для игр 💜\n\n"
        "Просто расскажи мне:\n"
        "какие игры ты любишь, на каких ролях играешь и какой у тебя ранг —\n"
        "а дальше я всё сделаю сама ✨\n\n"
        "Ну что, начнём поиск? 🚀",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="🚀 Открыть DuoSearch", web_app=WebAppInfo(url=settings.MINI_APP_URL))],
            [InlineKeyboardButton(text="📝 Регистрация в боте", callback_data="reg_start")],
        ]),
        parse_mode="HTML"
    )


@router.callback_query(F.data == "reg_start")
async def reg_start(call: CallbackQuery, state: FSMContext):
    await state.set_state(RegistrationState.name)
    logger.info("User %s started registration", call.from_user.id)
    msg = await call.message.answer("Как тебя зовут?")
    await state.update_data(question_msg_id=msg.message_id)
    await call.answer()


@router.callback_query(F.data == "menu_myfeed")
async def menu_myfeed(call: CallbackQuery, session: AsyncSession, state: FSMContext):
    from db.repositories.feed_repo import FeedRepository
    repo = FeedRepository(session)
    me = await repo.get_user_by_telegram_id(call.from_user.id)
    if not me:
        await call.answer("Ты ещё не зарегистрирован.", show_alert=True)
        return
    games = list(me.games.keys())
    if not games:
        await call.answer("Ты не указал ни одной игры.", show_alert=True)
        return
    
    # Delete the original message (main menu) to avoid chat spam
    try:
        await call.message.delete()
    except:
        pass
    
    # Show game selection keyboard with ALL games pre-selected by default
    await state.set_state("feed_game_selection")
    await state.update_data(selected_games=games, available_games=games)
    from handlers.feed import _build_game_selection_kb
    kb = _build_game_selection_kb(games, games)  # All selected by default
    await call.bot.send_message(call.from_user.id, "🎮 Выбери игры для поиска (все игры выбраны по умолчанию, нажми чтобы убрать):", reply_markup=kb)
    await call.answer()


async def _show_game_picker(call, session, games: list[str], selected: set[str]):
    kb_rows = []
    for g in games:
        mark = " ✅" if g in selected else ""
        kb_rows.append([InlineKeyboardButton(
            text=f"{RANKS.get(g, {}).get('display', g)}{mark}",
            callback_data=f"gpick_{g}"
        )])
    kb_rows.append([InlineKeyboardButton(
        text="✅ Выбрать все" if len(selected) < len(games) else "Снять все",
        callback_data="gpick_all"
    )])
    if selected:
        kb_rows.append([InlineKeyboardButton(
            text=f"🔍 Найти ({len(selected)})",
            callback_data="gpick_search"
        )])
    await call.message.answer("Выбери игры для поиска:", reply_markup=InlineKeyboardMarkup(inline_keyboard=kb_rows))
    await call.answer()


@router.callback_query(F.data == "gpick_all")
async def gpick_all(call: CallbackQuery, session: AsyncSession):
    from db.repositories.feed_repo import FeedRepository
    repo = FeedRepository(session)
    me = await repo.get_user_by_telegram_id(call.from_user.id)
    if not me:
        await call.answer("Ошибка.", show_alert=True)
        return
    games = list(me.games.keys())
    await _show_game_picker(call, session, games, set(games))


@router.callback_query(F.data == "gpick_search")
async def gpick_search(call: CallbackQuery, state: FSMContext, session: AsyncSession):
    from db.repositories.feed_repo import FeedRepository
    repo = FeedRepository(session)
    me = await repo.get_user_by_telegram_id(call.from_user.id)
    if not me:
        await call.answer("Ошибка.", show_alert=True)
        return
    games = list(me.games.keys())
    await state.update_data(feed_games=games)
    await state.set_state(FeedState.multi_games)
    await _show_candidates_multi(call, session, games, 0)


@router.callback_query(F.data.startswith("gpick_"))
async def gpick_toggle(call: CallbackQuery, session: AsyncSession):
    game = call.data.replace("gpick_", "")
    from db.repositories.feed_repo import FeedRepository
    repo = FeedRepository(session)
    me = await repo.get_user_by_telegram_id(call.from_user.id)
    if not me:
        await call.answer("Ошибка.", show_alert=True)
        return
    games = list(me.games.keys())
    selected = set(games)
    if game in selected:
        selected.remove(game)
    else:
        selected.add(game)
    await _show_game_picker(call, session, games, selected)


async def _show_candidates(call, session: AsyncSession, game: str, idx: int):
    from handlers.feed import _show_candidate_message
    await _show_candidate_message(call, session, game, idx)


async def _show_candidates_multi(call, session: AsyncSession, games: list[str], idx: int):
    from handlers.feed import _show_candidate_multi_message
    await _show_candidate_multi_message(call, session, games, idx)


@router.callback_query(F.data == "menu_matches")
async def menu_matches(call: CallbackQuery, session: AsyncSession):
    from db.repositories.like_repo import LikeRepository
    like_repo = LikeRepository(session)
    me_db = await like_repo.get_user_by_telegram(call.from_user.id)
    if not me_db:
        await call.answer("Ты ещё не зарегистрирован.", show_alert=True)
        return
    from db.models.match import Match
    from sqlalchemy import select
    matches_result = await session.execute(
        select(Match).where(
            (Match.user1_id == me_db.id) | (Match.user2_id == me_db.id)
        ).order_by(Match.created_at.desc())
    )
    match_rows = matches_result.scalars().all()
    if not match_rows:
        await call.message.answer("У тебя пока нет матчей 😔\nЛайкай игроков чтобы найти тиммейта!")
        await call.answer()
        return
    from db.repositories.chat_repo import ChatRepository
    from db.models.user import User as DBUser
    from db.models.chat_session import ChatSession
    GENDER_LABELS = {"M": "👨‍🦰", "F": "👩‍🦰", "NB": "🧑"}
    def _esc(t): return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    lines = ["🤝 <b>Твои матчи</b>\n"]
    kb_rows = []
    for m in match_rows:
        other_id = m.user2_id if m.user1_id == me_db.id else m.user1_id
        other_result = await session.execute(select(DBUser).where(DBUser.id == other_id))
        other = other_result.scalar_one_or_none()
        if not other:
            continue
        chat_repo = ChatRepository(session)
        cs = await chat_repo.get_session_by_match(m.id)
        status = "💬 Чат активен" if (cs and cs.is_active) else "💬 Начать чат"
        kb_rows.append([InlineKeyboardButton(
            text=f"{status} — {_esc(other.name)}",
            callback_data=f"chat_start_{m.id}_{other.telegram_id}"
        )])
        gender_icon = GENDER_LABELS.get(other.gender, "")
        name_esc = _esc(other.name)
        lines.append(f"{gender_icon} <b>{name_esc}</b>, {other.age} лет")
        lines.append(f"  🌍 {other.region.upper()} • {other.language}")
        lines.append("")
    await call.message.answer("\n".join(lines), parse_mode="HTML")
    if kb_rows:
        await call.message.answer("💬 Выбери матч для чата:", reply_markup=InlineKeyboardMarkup(inline_keyboard=kb_rows))
    await call.answer()


@router.callback_query(F.data == "menu_profile")
async def menu_profile(call: CallbackQuery, session: AsyncSession):
    from services.user_service import get_user
    user = await get_user(session, call.from_user.id)
    if not user:
        await call.answer("Ты ещё не зарегистрирован.", show_alert=True)
        return
    def _esc(t): return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
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
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="✏️ Редактировать", callback_data="profile_edit")]
    ])
    await call.message.answer("\n".join(lines), reply_markup=kb, parse_mode="HTML")
    await call.answer()


@router.callback_query(F.data == "menu_help")
async def menu_help(call: CallbackQuery):
    help_text = (
        "📖 Команды Duosearch\n\n"
        "/start - Начать регистрацию\n"
        "/profile - Посмотреть/редактировать свой профиль\n"
        "/myfeed - Найти тиммейта (карточки по одной, ⬅➡ навигация)\n"
        "/feed game_name - Показать сразу несколько кандидатов\n"
        "/matches - Твои матчи и начало чата\n"
        "/likes - Кто лайкнул тебя\n"
        "/stats - Твоя статистика\n"
        "/stop - Завершить чат с тиммейтом\n"
        "/send_telegram - Обмениваться контактами (после /stop)\n"
        "/help - Эта справка\n\n"
        "🎮 Поддерживаемые игры:\n"
        "CS2, Dota 2, Valorant, Overwatch, Apex Legends,\n"
        "League of Legends, Fortnite, Rocket League, PUBG\n\n"
        "Как это работает:\n"
        "1. Зарегистрируйся через /start\n"
        "2. Ищи тиммейтов через /myfeed\n"
        "3. Лайкай игроков, которые понравились\n"
        "4. При взаимном лайке - откроется чат через бота!\n"
        "5. Общайтесь, затем /stop и /send_telegram для обмена контактами\n\n"
        "🛡 Модерация:\n"
        "• 🚫 Жалоба - пожаловаться на игрока\n"
        "• 🚷 Блок - заблокировать игрока\n"
        "• Авто-бан при 3+ жалобах"
    )
    # Delete original message (main menu) to avoid chat spam
    try:
        await call.message.delete()
    except: 
        pass
    await call.bot.send_message(call.from_user.id, help_text)
    await call.answer()
    

# ---------------- NAME ----------------

@router.message(RegistrationState.name)
async def get_name(message: Message, state: FSMContext, session: AsyncSession, bot: Bot):
    name = message.text.strip()
    if len(name) < 2:
        await message.answer("Имя должно быть хотя бы 2 символа")
        return
    if len(name) > 50:
        await message.answer("Слишком длинное имя (максимум 50 символов)")
        return

    # 🔞 Filter bad words (mata)
    bad_words = ["мат", "бляд", "хуй", "пизд", "еба", "fuck", "shit", "bitch", "asshole"]
    name_lower = name.lower()
    if any(w in name_lower for w in bad_words):
        await message.answer("Используй нормальное имя!")
        return

    data = await state.get_data()
    edit_field = data.get("edit_field")

    if edit_field == "name":
        # Edit mode: save only name, show profile
        user = await get_user(session, message.from_user.id)
        if user:
            await upsert_user(
                session=session,
                telegram_id=message.from_user.id,
                name=name,
                age=user.age,
                gender=user.gender,
                language=user.language,
                region=user.region,
                looking_for=user.looking_for,
                games=user.games,
            )
            await state.clear()
            await message.answer(f"Имя обновлено: {name}")
            from handlers.profile import show_profile
            await show_profile(message, session)
        return

    # Delete previous question
    data = await state.get_data()
    qid = data.get("question_msg_id")
    if qid:
        try:
            await bot.delete_message(chat_id=message.chat.id, message_id=qid)
        except Exception as e:
            logger.warning("get_name: failed to delete msg %s from chat %s: %s", qid, message.chat.id, e)
    else:
        logger.info("get_name: no question_msg_id in state data: %s", data)

    await state.update_data(name=name)
    await state.set_state(RegistrationState.age)
    msg = await message.answer("Сколько тебе лет?")
    logger.info("User %s set name=%s, next question msg_id=%s", message.from_user.id, name, msg.message_id)
    await state.update_data(question_msg_id=msg.message_id)


# ---------------- AGE ----------------

@router.message(RegistrationState.age)
async def get_age(message: Message, state: FSMContext, session: AsyncSession, bot: Bot):
    if not message.text.isdigit():
        await message.answer("Введите число")
        return
    age = int(message.text)
    if age < 14 or age > 99:
        await message.answer("Возраст должен быть от 14 до 99")
        return

    data = await state.get_data()
    edit_field = data.get("edit_field")

    if edit_field == "age":
        # Edit mode: save only age, show profile
        user = await get_user(session, message.from_user.id)
        if user:
            await upsert_user(
                session=session,
                telegram_id=message.from_user.id,
                name=user.name,
                age=age,
                gender=user.gender,
                language=user.language,
                region=user.region,
                looking_for=user.looking_for,
                games=user.games,
            )
            await state.clear()
            await message.answer(f"Возраст обновлен: {age}")
            from handlers.profile import show_profile
            await show_profile(message, session)
        return

    # Delete previous question
    data = await state.get_data()
    qid = data.get("question_msg_id")
    if qid:
        try:
            await bot.delete_message(chat_id=message.chat.id, message_id=qid)
        except Exception as e:
            logger.warning("get_age: failed to delete msg %s from chat %s: %s", qid, message.chat.id, e)
    else:
        logger.info("get_age: no question_msg_id in state data: %s", data)

    await state.update_data(age=age)
    await state.set_state(RegistrationState.gender)
    logger.info("User %s set age=%d", message.from_user.id, age)
    
    kb = _gender_keyboard()
    msg = await message.answer(
        "Укажи свой пол:",
        reply_markup=kb
    )
    logger.info("get_age: stored gender question msg_id=%s", msg.message_id)
    await state.update_data(question_msg_id=msg.message_id)


# ---------------- GENDER ----------------

@router.callback_query(F.data.startswith("gender_"), RegistrationState.gender)
async def select_gender(call: CallbackQuery, state: FSMContext):
    gender = call.data.replace("gender_", "")
    await state.update_data(gender=gender)
    await state.set_state(RegistrationState.languages)
    logger.info("User %s set gender=%s", call.from_user.id, gender)
    # Delete the question message
    try:
        await call.message.delete()
    except:
        pass
    await call.message.answer(
        "Выбери языки, на которых говоришь:",
        reply_markup=_lang_keyboard([])
    )
    await call.answer()


# ---------------- LANGUAGES ----------------

@router.callback_query(F.data.startswith("lng_"), RegistrationState.languages)
async def select_lang(call: CallbackQuery, state: FSMContext):
    lang = call.data.replace("lng_", "")
    data = await state.get_data()
    langs = data.get("languages", [])

    if lang in langs:
        langs.remove(lang)
    else:
        langs.append(lang)

    await state.update_data(languages=langs)
    logger.info("User %s toggled language=%s, selected=%s", call.from_user.id, lang, langs)
    kb = _lang_keyboard(langs)
    kb.inline_keyboard.append([
        InlineKeyboardButton(text="Далее ➡", callback_data="lang_done")
    ])
    await safe_edit(call, reply_markup=kb)
    await call.answer()


@router.callback_query(F.data == "lang_done", RegistrationState.languages)
async def lang_done(call: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    langs = data.get("languages", [])
    if not langs:
        await call.answer("Выбери хотя бы один язык")
        return
    # Delete the question message
    try:
        await call.message.delete()
    except:
        pass
    await state.set_state(RegistrationState.region)
    logger.info("User %s confirmed languages=%s", call.from_user.id, langs)
    await call.message.answer(
        "Выбери сервер:",
        reply_markup=_region_keyboard()
    )
    await call.answer()


# ---------------- REGION ----------------

@router.callback_query(F.data.startswith("region_"), RegistrationState.region)
async def select_region(call: CallbackQuery, state: FSMContext):
    region = call.data.replace("region_", "")
    await state.update_data(region=region)
    await state.set_state(RegistrationState.games)
    logger.info("User %s set region=%s", call.from_user.id, region)
    try:
        await call.message.delete()
    except:
        pass
    await call.message.answer(
        "Выбери свои игры:",
        reply_markup=_games_keyboard([])
    )
    await call.answer()


# ---------------- GAME SELECTION ----------------

@router.callback_query(F.data.startswith("game_"), RegistrationState.games)
async def select_game(call: CallbackQuery, state: FSMContext):
    game = call.data.replace("game_", "")
    data = await state.get_data()
    games = data.get("games", [])

    if game in games:
        games.remove(game)
    else:
        games.append(game)

    await state.update_data(games=games)
    logger.info("User %s toggled game=%s, selected=%s", call.from_user.id, game, games)
    kb = _games_keyboard(games)
    kb.inline_keyboard.append([
        InlineKeyboardButton(text="Далее ➡", callback_data="games_done")
    ])
    await safe_edit(call, reply_markup=kb)
    await call.answer()


@router.callback_query(F.data == "games_done", RegistrationState.games)
async def games_done(call: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    games = data.get("games", [])
    if not games:
        await call.answer("Выбери хотя бы одну игру")
        return

    try:
        await call.message.delete()
    except:
        pass

    await state.update_data(game_idx=0)
    logger.info("User %s confirmed games=%s", call.from_user.id, games)
    await _start_game_flow(call, state, games, 0)
    await call.answer()


# ---------------- PER-GAME FLOW ----------------

async def _start_game_flow(call, state, games: list, game_idx: int):
    game = games[game_idx]
    logger.info("Processing game=%s (has_roles=%s, rank_per_role=%s)", game, has_roles(game), rank_per_role(game))

    game_display = _esc(RANKS[game]["display"])

    if has_roles(game):
        await state.set_state(RegistrationState.roles)
        roles = get_game_roles(game)
        selected = []
        await state.update_data(roles={game: selected})
        await call.message.answer(
            f"🎮 <b>{game_display}</b>\nВыбери свои роли:",
            reply_markup=_roles_keyboard(game, roles, selected),
            parse_mode="HTML"
        )
    else:
        await state.set_state(RegistrationState.rank)
        ranks = get_game_ranks(game)
        await call.message.answer(
            f"🎮 <b>{game_display}</b>\nВыбери свой ранг:",
            reply_markup=_rank_keyboard_simple(game, ranks, ""),
            parse_mode="HTML"
        )


@router.callback_query(F.data.startswith("role_"), RegistrationState.roles)
async def select_role(call: CallbackQuery, state: FSMContext):
    _, game, role_cb = call.data.split("_", 2)
    role_lower = role_cb.lower()

    all_roles = get_game_roles(game)
    role = None
    for r in all_roles:
        if _role_cb_key(r) == role_lower:
            role = r
            break
    if role is None:
        await call.answer()
        return

    data = await state.get_data()
    roles = data.get("roles", {})
    selected = roles.get(game, [])

    if role in selected:
        selected.remove(role)
    else:
        selected.append(role)

    roles[game] = selected
    await state.update_data(roles=roles)
    logger.info("User %s toggled role=%s for game=%s", call.from_user.id, role, game)

    kb = _roles_keyboard(game, all_roles, selected)
    if selected:
        kb.inline_keyboard.append([
            InlineKeyboardButton(text="Далее ➡", callback_data="roles_done")
        ])

    await safe_edit(call, reply_markup=kb)
    await call.answer()


@router.callback_query(F.data == "roles_done")
async def roles_done(call: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    games = data.get("games", [])
    game_idx = data.get("game_idx", 0)
    game = games[game_idx]
    roles = data.get("roles", {}).get(game, [])

    if not roles:
        await call.answer("Выбери хотя бы одну роль")
        return

    try:
        await call.message.delete()
    except:
        pass

    summary = ", ".join(_esc(r) for r in roles)
    logger.info("User %s confirmed roles for game=%s: %s", call.from_user.id, game, roles)

    if rank_per_role(game):
        await call.message.answer(f"✅ Роли: {summary}\nТеперь укажи ранги для каждой:")
        await state.update_data(rank_selected={})
        await _go_to_rank_per_role(call, state, game, roles, 0)
    else:
        await state.set_state(RegistrationState.rank)
        ranks = get_game_ranks(game)
        await call.message.answer(
            f"✅ Роли: {summary}\n\nТеперь укажи свой ранг:",
            reply_markup=_rank_keyboard_simple(game, ranks, ""),
            parse_mode="HTML"
        )
    await call.answer()


async def _go_to_rank_per_role(call, state, game: str, roles: list, role_idx: int):
    data = await state.get_data()

    if role_idx >= len(roles):
        await _next_game_or_finish(call, state, data.get("games", []), data.get("game_idx", 0))
        return

    role = roles[role_idx]
    ranks = get_game_ranks(game)
    rank_selected = data.get("rank_selected", {}).get(game, {})

    await state.update_data(role_idx=role_idx)

    await call.message.answer(
        f"🎯 Ранг для <b>{_esc(role)}</b> ({role_idx + 1}/{len(roles)}):",
        reply_markup=_rank_keyboard_roles(game, ranks, role_idx, rank_selected.get(role, "")),
        parse_mode="HTML"
    )


@router.callback_query(F.data.startswith("rnk_") & ~F.data.endswith("_confirm"))
async def select_rank_simple(call: CallbackQuery, state: FSMContext):
    parts = call.data.split("_", 2)
    game = parts[1]
    rank = _rank_from_cb(parts[2])

    data = await state.get_data()
    games = data.get("games", [])
    game_idx = data.get("game_idx", 0)

    ranks = data.get("ranks", {})
    ranks[game] = rank
    await state.update_data(ranks=ranks)
    logger.info("User %s set rank=%s for game=%s", call.from_user.id, rank, game)

    all_ranks = get_game_ranks(game)
    kb = _rank_keyboard_simple(game, all_ranks, rank)
    kb.inline_keyboard.append([
        InlineKeyboardButton(text="Подтвердить ➡", callback_data="rnk_confirm")
    ])
    await safe_edit(call, reply_markup=kb)
    await call.answer(f"Выбрано: {rank}")


@router.callback_query(F.data.startswith("rkr_") & ~F.data.endswith("_confirm"))
async def select_rank_roles(call: CallbackQuery, state: FSMContext):
    parts = call.data.split("_", 3)
    game = parts[1]
    role_idx = int(parts[2])
    rank = _rank_from_cb(parts[3])

    data = await state.get_data()
    roles = data.get("roles", {}).get(game, [])

    if role_idx < 0 or role_idx >= len(roles):
        await call.answer("Ошибка: неверная роль")
        return

    role = roles[role_idx]

    rank_selected = data.get("rank_selected", {})
    if game not in rank_selected:
        rank_selected[game] = {}
    rank_selected[game][role] = rank
    await state.update_data(rank_selected=rank_selected)

    logger.info("User %s selected rank=%s for role=%s", call.from_user.id, rank, role)

    all_ranks = get_game_ranks(game)
    kb = _rank_keyboard_roles(game, all_ranks, role_idx, rank)
    kb.inline_keyboard.append([
        InlineKeyboardButton(text="Подтвердить ➡", callback_data="rkr_confirm")
    ])
    await safe_edit(call, reply_markup=kb)
    await call.answer(f"Выбрано: {rank}")


@router.callback_query(F.data == "rnk_confirm")
async def rank_confirm_simple(call: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    game = data.get("games", [])[data.get("game_idx", 0)]
    rank = data.get("ranks", {}).get(game, "")

    logger.info("User %s confirmed rank=%s for game=%s", call.from_user.id, rank, game)
    try:
        await call.message.delete()
    except:
        pass
    await call.message.answer("✅ Подтверждено!")
    await _next_game_or_finish(call, state, data.get("games", []), data.get("game_idx", 0))
    await call.answer()


@router.callback_query(F.data == "rkr_confirm")
async def rank_confirm_roles(call: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    game = data.get("games", [])[data.get("game_idx", 0)]
    roles = data.get("roles", {}).get(game, [])
    role_idx = data.get("role_idx", 0)
    rank_selected = data.get("rank_selected", {}).get(game, {})
    role = roles[role_idx]
    rank = rank_selected.get(role, "")

    ranks = data.get("ranks", {})
    if game not in ranks:
        ranks[game] = {}
    ranks[game][role] = rank
    await state.update_data(ranks=ranks)

    logger.info("User %s confirmed rank=%s for role=%s", call.from_user.id, rank, role)

    role_idx += 1
    await state.update_data(role_idx=role_idx)

    try:
        await call.message.delete()
    except:
        pass

    await call.message.answer("✅ Подтверждено!")

    if role_idx < len(roles):
        await _go_to_rank_per_role(call, state, game, roles, role_idx)
    else:
        await _next_game_or_finish(call, state, data.get("games", []), data.get("game_idx", 0))

    await call.answer()


async def _next_game_or_finish(call, state, games: list, game_idx: int):
    game_idx += 1
    await state.update_data(game_idx=game_idx)

    if game_idx < len(games):
        await _start_game_flow(call, state, games, game_idx)
    else:
        logger.info("User %s completed all games", call.from_user.id)

        kb = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="✅ Завершить регистрацию", callback_data="finalize")]
        ])
        await call.message.answer(
            "✅ Все игры заполнены! Завершаем регистрацию.",
            reply_markup=kb
        )


# ---------------- FINALIZE ----------------

@router.callback_query(F.data == "finalize")
async def finalize_registration(call: CallbackQuery, state: FSMContext, session: AsyncSession):
    data = await state.get_data()

    all_ranks = data.get("ranks", {})
    games_data = {}

    for game_key in data.get("games", []):
        if has_roles(game_key):
            roles = data.get("roles", {}).get(game_key, [])
            game_ranks = all_ranks.get(game_key, {})

            if rank_per_role(game_key):
                games_data[game_key] = {
                    "roles": game_ranks if isinstance(game_ranks, dict) else {},
                    "rank": "",
                }
            else:
                rank_str = game_ranks if isinstance(game_ranks, str) else ""
                games_data[game_key] = {
                    "roles": {role: rank_str for role in roles},
                    "rank": rank_str,
                }
        else:
            rank = all_ranks.get(game_key, "")
            games_data[game_key] = {
                "rank": rank,
                "roles": {},
            }

    logger.info("User %s finalizing: %s", call.from_user.id, games_data)

    # Check if this is edit mode (from profile edit)
    is_edit_mode = data.get("edit_mode", False)

    # Delete the "Все игры заполнены" message
    try:
        await call.message.delete()
    except:
        pass

    try:
        if is_edit_mode:
            # Update existing user with new games, keep other fields from edit data
            user = await upsert_user(
                session=session,
                telegram_id=call.from_user.id,
                name=data.get("edit_name", data["name"]),
                age=data.get("edit_age", data["age"]),
                gender=data.get("edit_gender", data["gender"]),
                language=data.get("edit_language", ",".join(data.get("languages", ["ru"]))),
                region=data.get("edit_region", data["region"]),
                looking_for=data.get("edit_looking_for", "any"),
                games=games_data,
            )
            await call.message.answer("🎮 Игры успешно обновлены!")
            # Show updated profile
            from handlers.profile import _format_profile_text
            await call.message.answer(
                _format_profile_text(user),
                reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                    [InlineKeyboardButton(text="✏️ Редактировать", callback_data="profile_edit")],
                    [InlineKeyboardButton(text="🔄 Перерегистрация", callback_data="profile_reregister")],
                ]),
                parse_mode="HTML"
            )
        else:
            # Normal registration
            user = await upsert_user(
                session=session,
                telegram_id=call.from_user.id,
                name=data["name"],
                age=data["age"],
                gender=data["gender"],
                language=",".join(data.get("languages", ["ru"])),
                region=data["region"],
                looking_for="any",
                games=games_data,
            )
            profile_text = _format_profile(user)
            await call.message.answer(profile_text, parse_mode="HTML")

            await call.message.answer(
                "🎉 Ура! Твой профиль готов, а значит можно начинать поиск тиммейтов 💜\n\n"
                "Вот что доступно тебе сейчас:\n\n"
                "🔍 <b>Найти тиммейта</b> — ищи игроков по играм, ролям и рангу\n"
                "🤝 <b>Мои матчи</b> — смотри свои совпадения и переходи в чаты\n"
                "👤 <b>Профиль</b> — изменяй информацию о себе в любой момент\n\n"
                "Руру уже готова помочь тебе найти идеальную команду 🐾",
                parse_mode="HTML",
                reply_markup=MAIN_MENU
            )
    except PermissionError:
        await call.message.answer("⛔ Ваш аккаунт заблокирован.")
        await state.clear()
        return

    await state.clear()


def _format_profile(user) -> str:
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

    return "\n".join(lines)


# ---------------- KEYBOARDS ----------------

def _gender_keyboard():
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text=t, callback_data=f"gender_{c}")]
        for c, t in GENDER_LABELS.items()
    ])


def _lang_keyboard(selected: list[str]):
    keys = list(LANGS.keys())
    buttons = []
    for i in range(0, len(keys), 2):
        row = []
        for j in range(2):
            if i + j < len(keys):
                lang = keys[i + j]
                mark = " ✅" if lang in selected else ""
                row.append(InlineKeyboardButton(
                    text=f"{LANGS[lang]}{mark}",
                    callback_data=f"lng_{lang}"
                ))
        buttons.append(row)
    return InlineKeyboardMarkup(inline_keyboard=buttons)


def _region_keyboard():
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text=t.split()[-1] if " " in t else t, callback_data=f"region_{c}")]
        for c, t in REGIONS.items()
    ])


def _games_keyboard(selected: list[str]):
    keys = list(RANKS.keys())
    buttons = []
    for i in range(0, len(keys), 2):
        row = []
        for j in range(2):
            if i + j < len(keys):
                g = keys[i + j]
                mark = " ✅" if g in selected else ""
                row.append(InlineKeyboardButton(
                    text=f"{RANKS[g]['display']}{mark}",
                    callback_data=f"game_{g}"
                ))
        buttons.append(row)
    return InlineKeyboardMarkup(inline_keyboard=buttons)


def _roles_keyboard(game: str, all_roles: list[str], selected: list[str]):
    buttons = []
    for r in all_roles:
        mark = " ✅" if r in selected else ""
        buttons.append([InlineKeyboardButton(
            text=f"{r}{mark}",
            callback_data=f"role_{game}_{_role_cb_key(r)}"
        )])
    return InlineKeyboardMarkup(inline_keyboard=buttons)


def _rank_keyboard_simple(game: str, ranks: list[str], selected: str):
    buttons = []
    for i in range(0, len(ranks), 3):
        row = []
        for r in ranks[i:i + 3]:
            mark = " ✅" if r == selected else ""
            row.append(InlineKeyboardButton(
                text=f"{r}{mark}",
                callback_data=f"rnk_{game}_{_rank_cb_key(r)}"
            ))
        buttons.append(row)
    return InlineKeyboardMarkup(inline_keyboard=buttons)


def _rank_keyboard_roles(game: str, ranks: list[str], role_idx: int, selected: str):
    buttons = []
    for i in range(0, len(ranks), 3):
        row = []
        for r in ranks[i:i + 3]:
            mark = " ✅" if r == selected else ""
            row.append(InlineKeyboardButton(
                text=f"{r}{mark}",
                callback_data=f"rkr_{game}_{role_idx}_{_rank_cb_key(r)}"
            ))
        buttons.append(row)
    return InlineKeyboardMarkup(inline_keyboard=buttons)
