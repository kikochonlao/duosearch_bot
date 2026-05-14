import logging
from aiogram import Router, F
from aiogram.types import Message, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.exceptions import TelegramBadRequest
from sqlalchemy.ext.asyncio import AsyncSession

from db.repositories.like_repo import LikeRepository

router = Router()
logger = logging.getLogger("duosearch.feed")

GENDER_LABELS = {"M": "👨‍🦰", "F": "👩‍🦰", "NB": "🧑"}


@router.message(Command("myfeed"))
async def myfeed_command(message: Message, session: AsyncSession, state: FSMContext):
    """Handle /myfeed command - show game selection for feed"""
    await state.clear()
    await state.set_state("feed_game_selection")
    
    # Delete user's command message to avoid chat spam
    try:
        await message.delete()
    except:
        pass
    
    from services.user_service import get_user
    user = await get_user(session, message.from_user.id)
    if not user:
        # Can't delete, so just answer
        await message.answer("Ты ещё не зарегистрирован. Нажми /start")
        return

    if not user.games:
        await message.answer("Сначала добавь игры в профиле (/profile)")
        return

    # Show game selection keyboard with ALL games pre-selected by default
    games = list(user.games.keys())
    await state.update_data(selected_games=games, available_games=games)
    kb = _build_game_selection_kb(games, games)  # All selected by default
    await message.answer("🎮 Выбери игры для поиска (все игры выбраны по умолчанию, нажми чтобы убрать):", reply_markup=kb)


async def _show_candidate_message_for_message(message: Message, session: AsyncSession, game: str, idx: int, user_id: int = None):
    """Show candidate card - for Message objects only"""
    from services.feed_service import FeedService
    feed_service = FeedService(session)
    uid = user_id or message.from_user.id
    users = await feed_service.get_feed(uid, game=game)
    if not users:
        await message.answer("Нет кандидатов для этой игры 😔")
        return
    if idx >= len(users):
        idx = len(users) - 1
    u = users[idx]
    text = _build_candidate_text(game, u)
    kb = _build_candidate_kb(u, game, idx, len(users))
    await message.answer(text, reply_markup=kb, parse_mode="HTML")


def _build_game_selection_kb(games: list[str], selected: list[str]) -> InlineKeyboardMarkup:
    """Build game selection keyboard with toggle"""
    buttons = []
    for game in games:
        mark = " ✅" if game in selected else ""
        buttons.append([InlineKeyboardButton(
            text=f"{game}{mark}",
            callback_data=f"feed_toggle_{game}"
        )])
    # Add search button if at least one game selected
    if selected:
        buttons.append([InlineKeyboardButton(text="🔍 Искать во всех выбранных играх", callback_data="feed_search_all")])
    else:
        buttons.append([InlineKeyboardButton(text="✅ Готово", callback_data="feed_select_done")])
    return InlineKeyboardMarkup(inline_keyboard=buttons)


@router.callback_query(F.data.startswith("feed_toggle_"))
async def feed_toggle_game(call: CallbackQuery, state: FSMContext, session: AsyncSession):
    """Toggle game selection"""
    game = call.data.replace("feed_toggle_", "")
    data = await state.get_data()
    selected = set(data.get("selected_games", []))

    if game in selected:
        selected.remove(game)
    else:
        selected.add(game)
    await state.update_data(selected_games=list(selected))

    # Rebuild keyboard with updated selection
    games = list(data.get("available_games", []))
    kb = _build_game_selection_kb(games, list(selected))
    await call.message.edit_reply_markup(reply_markup=kb)
    await call.answer()


@router.callback_query(F.data == "feed_select_done")
async def feed_select_done(call: CallbackQuery, state: FSMContext, session: AsyncSession):
    """Show candidates for selected games (single game)"""
    data = await state.get_data()
    selected = data.get("selected_games", [])
    if not selected:
        await call.answer("Выбери хотя бы одну игру", show_alert=True)
        return

    # Single game - show cards
    await state.clear()
    await _show_candidate_message_for_message(call.message, session, selected[0], 0, call.from_user.id)
    await call.answer()


@router.callback_query(F.data == "feed_search_all")
async def feed_search_all(call: CallbackQuery, state: FSMContext, session: AsyncSession):
    """Show candidates for all selected games"""
    data = await state.get_data()
    selected = data.get("selected_games", [])
    if not selected:
        await call.answer("Выбери хотя бы одну игру", show_alert=True)
        return

    # Multiple games - show all candidates
    await state.clear()
    await _show_candidate_multi_message_for_message(call.message, session, selected, 0, call.from_user.id)
    await call.answer()


async def _show_candidate_multi_message_for_message(message: Message, session: AsyncSession, games: list[str], idx: int, user_id: int = None):
    """Show candidate card from multiple games - for Message objects only"""
    from services.feed_service import FeedService
    uid = user_id or message.from_user.id
    all_candidates = []
    for game in games:
        feed_service = FeedService(session)
        users = await feed_service.get_feed(uid, game=game)
        for u in users:
            all_candidates.append((game, u))
    if not all_candidates:
        await message.answer("Нет кандидатов по выбранным играм 😔")
        return
    if idx >= len(all_candidates):
        idx = len(all_candidates) - 1
    game, u = all_candidates[idx]
    text = _build_candidate_text(game, u)
    kb = _build_candidate_multi_kb(u, game, idx, len(all_candidates), games)
    await message.answer(text, reply_markup=kb, parse_mode="HTML")

MARKER_LIKE = "\n\n❤️ Лайк отправлен!"
MARKER_MATCH = "\n\n🎉 <b>МАТЧ!</b> Взаимный лайк!"
MARKER_SKIP = "\n\n⏭ Пропущено"


async def safe_edit_text(call, text: str, **kwargs):
    if MARKER_LIKE in call.message.text or MARKER_MATCH in call.message.text or MARKER_SKIP in call.message.text:
        await call.answer()
        return
    try:
        await call.message.edit_text(text, **kwargs)
    except TelegramBadRequest:
        pass


async def _show_candidate_message(call, session: AsyncSession, game: str, idx: int):
    from services.feed_service import FeedService
    feed_service = FeedService(session)
    users = await feed_service.get_feed(call.from_user.id, game=game)
    if not users:
        await call.message.answer("Нет кандидатов для этой игры 😔")
        return
    if idx >= len(users):
        idx = len(users) - 1
    u = users[idx]
    text = _build_candidate_text(game, u)
    kb = _build_candidate_kb(u, game, idx, len(users))
    await call.message.answer(text, reply_markup=kb, parse_mode="HTML")


async def _show_candidate_multi_message(call, session: AsyncSession, games: list[str], idx: int):
    from services.feed_service import FeedService
    all_candidates = []
    for game in games:
        feed_service = FeedService(session)
        users = await feed_service.get_feed(call.from_user.id, game=game)
        for u in users:
            all_candidates.append((game, u))
    if not all_candidates:
        await call.message.answer("Нет кандидатов по выбранным играм 😔")
        return
    if idx >= len(all_candidates):
        idx = len(all_candidates) - 1
    game, u = all_candidates[idx]
    text = _build_candidate_text(game, u)
    kb = _build_candidate_multi_kb(u, game, idx, len(all_candidates), games)
    await call.message.answer(text, reply_markup=kb, parse_mode="HTML")


@router.callback_query(F.data.startswith("like_"))
async def handle_like(call: CallbackQuery, session: AsyncSession):
    parts = call.data.split("_", 2)
    to_telegram_id = int(parts[1])
    game = parts[2] if len(parts) > 2 else "unknown"

    repo = LikeRepository(session)
    is_match, match_id, other_user = await repo.like(call.from_user.id, to_telegram_id, game)

    if is_match and other_user:
        initiator_tg = call.from_user.id
        target_tg = to_telegram_id

        kb_initiator = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="💬 Начать чат", callback_data=f"chat_start_{match_id}_{target_tg}")]
        ])
        kb_target = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="💬 Начать чат", callback_data=f"chat_start_{match_id}_{initiator_tg}")]
        ])

        # Лайкнувшему — редактируем карточку + отправляем уведомление
        me_msg = call.message.text + MARKER_MATCH
        try:
            await call.message.edit_text(me_msg, reply_markup=kb_initiator, parse_mode="HTML")
        except TelegramBadRequest:
            await call.message.answer(me_msg, reply_markup=kb_initiator, parse_mode="HTML")

        initiator_notification = (
            f"🎉 <b>У тебя МАТЧ!</b>\n\n"
            f"Игрок <b>{_esc(other_user.name)}</b> тоже хочет играть с тобой в {game}!\n"
            f"Нажми «💬 Начать чат» чтобы пообщаться. Контакты откроются после mutual agreement."
        )
        try:
            await call.message.answer(initiator_notification, reply_markup=kb_initiator, parse_mode="HTML")
        except Exception as e:
            logger.error("Failed to notify match to initiator %s: %s", initiator_tg, e)

        # Тому, кого лайкнули — уведомление
        them_msg = (
            f"🎉 <b>У тебя МАТЧ!</b>\n\n"
            f"Игрок из Duosearch хочет играть с тобой в {game}!\n"
            f"Нажми «💬 Начать чат» чтобы пообщаться. Контакты откроются после mutual agreement."
        )
        try:
            await call.bot.send_message(target_tg, them_msg, reply_markup=kb_target, parse_mode="HTML")
        except Exception as e:
            logger.error("Failed to notify match to %s: %s", target_tg, e)
    else:
        await safe_edit_text(call, call.message.text + MARKER_LIKE, parse_mode="HTML")

    await call.answer()


@router.callback_query(F.data.startswith("skip_"))
async def handle_skip(call: CallbackQuery, session: AsyncSession):
    await safe_edit_text(call, call.message.text + MARKER_SKIP, parse_mode="HTML")
    await call.answer()


@router.callback_query(F.data.startswith("report_"))
async def handle_report(call: CallbackQuery, session: AsyncSession):
    from db.models.report import Report
    from db.repositories.like_repo import LikeRepository
    like_repo = LikeRepository(session)
    me = await like_repo.get_user_by_telegram(call.from_user.id)
    if not me:
        await call.answer("Ты не зарегистрирован.", show_alert=True)
        return
    reported_tg_id = int(call.data.replace("report_", ""))
    reported = await like_repo.get_user_by_telegram(reported_tg_id)
    if not reported:
        await call.answer("Пользователь не найден.", show_alert=True)
        return
    existing = await session.execute(
        Report.__table__.select().where(
            Report.reporter_id == me.id,
            Report.reported_user_id == reported.id,
        )
    )
    if existing.scalar_one_or_none():
        await call.answer("Ты уже жаловался на этого пользователя.", show_alert=True)
        return
    report = Report(reporter_id=me.id, reported_user_id=reported.id, reason="user_report")
    session.add(report)
    await session.commit()
    await call.answer("🚨 Жалоба отправлена. Модераторы рассмотрят её.")


@router.callback_query(F.data.startswith("block_"))
async def handle_block(call: CallbackQuery, session: AsyncSession):
    from db.models.block import Block
    from db.repositories.like_repo import LikeRepository
    like_repo = LikeRepository(session)
    me = await like_repo.get_user_by_telegram(call.from_user.id)
    if not me:
        await call.answer("Ты не зарегистрирован.", show_alert=True)
        return
    blocked_tg_id = int(call.data.replace("block_", ""))
    blocked = await like_repo.get_user_by_telegram(blocked_tg_id)
    if not blocked:
        await call.answer("Пользователь не найден.", show_alert=True)
        return
    existing = await session.execute(
        Block.__table__.select().where(
            Block.user_id == me.id,
            Block.blocked_user_id == blocked.id,
        )
    )
    if existing.scalar_one_or_none():
        await call.answer("Ты уже заблокировал этого пользователя.", show_alert=True)
        return
    block = Block(user_id=me.id, blocked_user_id=blocked.id)
    session.add(block)
    await session.commit()
    await call.answer("🚷 Пользователь заблокирован. Ты больше не увидишь его в поиске.")


@router.callback_query(F.data.startswith("next_") & ~F.data.startswith("next_multi"))
async def next_candidate(call: CallbackQuery, session: AsyncSession):
    parts = call.data.split("_")
    game = parts[1]
    idx = int(parts[2]) + 1
    from services.feed_service import FeedService
    feed_service = FeedService(session)
    users = await feed_service.get_feed(call.from_user.id, game=game)
    if not users or idx >= len(users):
        await call.message.answer("Больше нет кандидатов 😔")
        await call.answer()
        return
    u = users[idx]
    text = _build_candidate_text(game, u)
    kb = _build_candidate_kb(u, game, idx, len(users))
    await call.message.answer(text, reply_markup=kb, parse_mode="HTML")
    await call.answer()


@router.callback_query(F.data.startswith("prev_") & ~F.data.startswith("prev_multi"))
async def prev_candidate(call: CallbackQuery, session: AsyncSession):
    parts = call.data.split("_")
    game = parts[1]
    idx = int(parts[2]) - 1
    if idx < 0:
        await call.answer()
        return
    from services.feed_service import FeedService
    feed_service = FeedService(session)
    users = await feed_service.get_feed(call.from_user.id, game=game)
    if not users:
        await call.answer()
        return
    if idx >= len(users):
        idx = len(users) - 1
    u = users[idx]
    text = _build_candidate_text(game, u)
    kb = _build_candidate_kb(u, game, idx, len(users))
    await call.message.answer(text, reply_markup=kb, parse_mode="HTML")
    await call.answer()


@router.callback_query(F.data.startswith("next_multi_"))
async def next_multi(call: CallbackQuery, session: AsyncSession, state: FSMContext):
    from states.feed import FeedState
    current_state = await state.get_state()
    if current_state != FeedState.multi_games:
        await call.answer("Ошибка.", show_alert=True)
        return
    data = await state.get_data()
    games = data.get("feed_games", [])
    idx = int(call.data.replace("next_multi_", "")) + 1
    from services.feed_service import FeedService
    all_candidates = []
    for game in games:
        feed_service = FeedService(session)
        users = await feed_service.get_feed(call.from_user.id, game=game)
        for u in users:
            all_candidates.append((game, u))
    if not all_candidates or idx >= len(all_candidates):
        await call.message.answer("Больше нет кандидатов 😔")
        await call.answer()
        return
    game, u = all_candidates[idx]
    text = _build_candidate_text(game, u)
    kb = _build_candidate_multi_kb(u, game, idx, len(all_candidates), games)
    await call.message.answer(text, reply_markup=kb, parse_mode="HTML")
    await call.answer()


@router.callback_query(F.data.startswith("prev_multi_"))
async def prev_multi(call: CallbackQuery, session: AsyncSession, state: FSMContext):
    from states.feed import FeedState
    current_state = await state.get_state()
    if current_state != FeedState.multi_games:
        await call.answer("Ошибка.", show_alert=True)
        return
    data = await state.get_data()
    games = data.get("feed_games", [])
    idx = int(call.data.replace("prev_multi_", "")) - 1
    if idx < 0:
        await call.answer()
        return
    from services.feed_service import FeedService
    all_candidates = []
    for game in games:
        feed_service = FeedService(session)
        users = await feed_service.get_feed(call.from_user.id, game=game)
        for u in users:
            all_candidates.append((game, u))
    if not all_candidates:
        await call.answer()
        return
    if idx >= len(all_candidates):
        idx = len(all_candidates) - 1
    game, u = all_candidates[idx]
    text = _build_candidate_text(game, u)
    kb = _build_candidate_multi_kb(u, game, idx, len(all_candidates), games)
    await call.message.answer(text, reply_markup=kb, parse_mode="HTML")
    await call.answer()


def _build_candidate_text(game: str, u) -> str:
    from keyboards.ranks import RANKS
    GENDER_LABELS = {"M": "👨‍🦰", "F": "👩‍🦰", "NB": "🧑"}
    display = _esc(RANKS.get(game, {}).get("display", game))
    gender_icon = GENDER_LABELS.get(u.gender, "")
    profile = u.games.get(game)
    name_esc = _esc(u.name)
    if profile.roles:
        roles_text = "\n".join(f"  • {_esc(r)}: {_esc(rank)}" for r, rank in profile.roles.items())
    elif profile.rank:
        roles_text = _esc(profile.rank)
    else:
        roles_text = "—"
    return (
        f"🎮 <b>{display}</b>\n\n"
        f"{gender_icon} <b>{name_esc}</b>, {u.age} лет\n"
        f"🏆 Ранги:\n{roles_text}\n"
        f"🌐 {u.language} • {u.region.upper()}"
    )


def _build_candidate_kb(u, game: str, idx: int, total: int) -> InlineKeyboardMarkup:
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="❤️ Лайк", callback_data=f"like_{u.telegram_id}_{game}"),
            InlineKeyboardButton(text="⏭ Пропустить", callback_data=f"skip_{u.telegram_id}"),
        ],
    ])
    if total > 1:
        nav_row = []
        if idx > 0:
            nav_row.append(InlineKeyboardButton(text="⬅ Назад", callback_data=f"prev_{game}_{idx}"))
        nav_row.append(InlineKeyboardButton(text="🔄 Далее", callback_data=f"next_{game}_{idx}"))
        kb.inline_keyboard.append(nav_row)
    kb.inline_keyboard.append([
        InlineKeyboardButton(text="🚫 Жалоба", callback_data=f"report_{u.telegram_id}"),
        InlineKeyboardButton(text="🚷 Блок", callback_data=f"block_{u.telegram_id}"),
    ])
    kb.inline_keyboard.append([InlineKeyboardButton(text="🔍 Сменить игру", callback_data="menu_myfeed")])
    return kb


def _build_candidate_multi_kb(u, game: str, idx: int, total: int, games: list[str]) -> InlineKeyboardMarkup:
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="❤️ Лайк", callback_data=f"like_{u.telegram_id}_{game}"),
            InlineKeyboardButton(text="⏭ Пропустить", callback_data=f"skip_{u.telegram_id}"),
        ],
    ])
    if total > 1:
        nav_row = []
        if idx > 0:
            nav_row.append(InlineKeyboardButton(text="⬅ Назад", callback_data=f"prev_multi_{idx}"))
        nav_row.append(InlineKeyboardButton(text="🔄 Далее", callback_data=f"next_multi_{idx}"))
        kb.inline_keyboard.append(nav_row)
    kb.inline_keyboard.append([
        InlineKeyboardButton(text="🚫 Жалоба", callback_data=f"report_{u.telegram_id}"),
        InlineKeyboardButton(text="🚷 Блок", callback_data=f"block_{u.telegram_id}"),
    ])
    kb.inline_keyboard.append([InlineKeyboardButton(text="🔍 Сменить игры", callback_data="menu_myfeed")])
    return kb


def _esc(text: str) -> str:
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")



