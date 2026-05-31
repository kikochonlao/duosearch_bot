import logging
from aiogram import Router, F
from aiogram.filters import Command
from aiogram.types import Message, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.repositories.like_repo import LikeRepository
from db.repositories.chat_repo import ChatRepository
from db.models.match import Match
from db.models.user import User as DBUser
from db.models.chat_session import ChatSession
from utils.constants import esc as _esc

router = Router()
logger = logging.getLogger("duosearch.matches")

GENDER_LABELS = {"M": "👨‍🦰", "F": "👩‍🦰", "NB": "🧑"}


@router.message(Command("matches"))
async def show_matches(message: Message, session: AsyncSession):
    like_repo = LikeRepository(session)
    me_db = await like_repo.get_user_by_telegram(message.from_user.id)
    if not me_db:
        await message.answer("Ты ещё не зарегистрирован. Нажми /start")
        return

    matches_result = await session.execute(
        select(Match).where(
            (Match.user1_id == me_db.id) | (Match.user2_id == me_db.id)
        ).order_by(Match.created_at.desc())
    )
    match_rows = matches_result.scalars().all()

    if not match_rows:
        await message.answer("У тебя пока нет матчей 😔\nЛайкай игроков чтобы найти тиммейта!")
        return

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

        games_text = []
        for game_key, profile in other.games.items():
            display = _esc(game_key.replace("_", " ").title())
            if profile.roles:
                roles = ", ".join(f"{_esc(r)}: {_esc(rank)}" for r, rank in profile.roles.items())
                games_text.append(f"  🎮 {display}: {roles}")
            elif profile.rank:
                games_text.append(f"  🎮 {display}: {_esc(profile.rank)}")

        lines.extend(games_text)
        lines.append("")

    await message.answer("\n".join(lines), parse_mode="HTML")

    if kb_rows:
        kb = InlineKeyboardMarkup(inline_keyboard=kb_rows)
        await message.answer("💬 Выбери матч для чата:", reply_markup=kb)


@router.message(F.text == "/likes")
async def show_likes(message: Message, session: AsyncSession):
    repo = LikeRepository(session)
    likers = await repo.get_liked_me(message.from_user.id)

    if not likers:
        await message.answer("Пока никто не лайкнул тебя 😔\nПродолжай искать тиммейтов!")
        return

    lines = ["💝 <b>Тебя лайкнули</b>\n"]
    for u in likers:
        gender_icon = GENDER_LABELS.get(u.gender, "")
        name_esc = _esc(u.name)
        games = ", ".join(u.get_games().keys()) if u.get_games() else "—"
        lines.append(f"{gender_icon} <b>{name_esc}</b>, {u.age} лет")
        lines.append(f"  🎮 {games}")
        lines.append("")

    await message.answer("\n".join(lines), parse_mode="HTML")
