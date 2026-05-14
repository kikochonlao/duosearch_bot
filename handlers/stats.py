import logging
from aiogram import Router, F
from aiogram.types import Message
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from db.models.user import User as DBUser
from db.models.like import Like
from db.models.match import Match
from db.models.report import Report

router = Router()
logger = logging.getLogger("duosearch.stats")


@router.message(F.text == "/stats")
async def show_stats(message: Message, session: AsyncSession):
    me = await session.execute(
        select(DBUser).where(DBUser.telegram_id == message.from_user.id)
    )
    me_user = me.scalar_one_or_none()

    if not me_user:
        await message.answer("Ты ещё не зарегистрирован. Нажми /start")
        return

    likes_given = await session.execute(
        select(func.count(Like.id)).where(Like.from_user_id == me_user.id)
    )
    likes_given_count = likes_given.scalar_one()

    likes_received = await session.execute(
        select(func.count(Like.id)).where(Like.to_user_id == me_user.id)
    )
    likes_received_count = likes_received.scalar_one()

    matches_count = await session.execute(
        select(func.count(Match.id)).where(
            (Match.user1_id == me_user.id) | (Match.user2_id == me_user.id)
        )
    )
    matches_total = matches_count.scalar_one()

    reports_given = await session.execute(
        select(func.count(Report.id)).where(Report.reporter_id == me_user.id)
    )
    reports_given_count = reports_given.scalar_one()

    reports_received = await session.execute(
        select(func.count(Report.id)).where(Report.reported_user_id == me_user.id)
    )
    reports_received_count = reports_received.scalar_one()

    games_list = list(me_user.get_games().keys())
    games_text = ", ".join(g.replace("_", " ").title() for g in games_list) if games_list else "—"

    match_rate = (matches_total / likes_given_count * 100) if likes_given_count > 0 else 0

    text = (
        f"📊 <b>Твоя статистика</b>\n\n"
        f"🎮 Игры: {games_text}\n\n"
        f"❤️ Лайков отправлено: {likes_given_count}\n"
        f"💝 Лайков получено: {likes_received_count}\n"
        f"🤝 Матчей: {matches_total}\n"
        f"📈 Конверсия лайков: {match_rate:.1f}%\n\n"
        f"🚨 Жалоб отправлено: {reports_given_count}\n"
        f"⚠️ Жалоб получено: {reports_received_count}"
    )

    await message.answer(text, parse_mode="HTML")
