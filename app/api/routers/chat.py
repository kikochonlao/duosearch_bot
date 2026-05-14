import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.api.deps.auth import get_telegram_user
from app.api.deps.db import get_session
from app.api.schemas.chat import MessageOut, MessageSend, ChatSessionOut
from db.models.user import User
from db.models.match import Match
from db.models.chat_session import ChatSession
from db.models.message import Message
from db.repositories.chat_repo import ChatRepository

router = APIRouter()


async def _resolve_telegram_id(auth: dict) -> int:
    raw = auth.get("user", {}).get("id")
    if isinstance(raw, str):
        try:
            return int(json.loads(raw).get("id"))
        except (json.JSONDecodeError, TypeError):
            pass
    return int(raw) if raw else None


@router.get("/sessions", response_model=list[ChatSessionOut])
async def get_chat_sessions(
    auth: dict = Depends(get_telegram_user),
    session: AsyncSession = Depends(get_session),
):
    telegram_id = await _resolve_telegram_id(auth)
    if not telegram_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No telegram_id")

    me = await session.execute(select(User).where(User.telegram_id == telegram_id))
    me_user = me.scalar_one_or_none()
    if not me_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    result = await session.execute(
        select(ChatSession).where(
            or_(ChatSession.user1_id == me_user.id, ChatSession.user2_id == me_user.id),
        ).order_by(ChatSession.created_at.desc())
    )
    sessions = result.scalars().all()

    output = []
    for cs in sessions:
        other_id = cs.user2_id if cs.user1_id == me_user.id else cs.user1_id
        other = await session.get(User, other_id)
        if not other:
            continue
        output.append(ChatSessionOut(
            id=cs.id,
            match_id=cs.match_id,
            other_user={
                "id": other.id,
                "telegram_id": other.telegram_id,
                "name": other.name,
            },
            is_active=cs.is_active,
            created_at=cs.created_at,
        ))

    return output


@router.get("/{match_id}/messages", response_model=list[MessageOut])
async def get_messages(
    match_id: int,
    auth: dict = Depends(get_telegram_user),
    session: AsyncSession = Depends(get_session),
):
    telegram_id = await _resolve_telegram_id(auth)
    if not telegram_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No telegram_id")

    me = await session.execute(select(User).where(User.telegram_id == telegram_id))
    me_user = me.scalar_one_or_none()
    if not me_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    match = await session.get(Match, match_id)
    if not match:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match not found")

    if match.user1_id != me_user.id and match.user2_id != me_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your match")

    result = await session.execute(
        select(Message).where(
            Message.match_id == match_id
        ).order_by(Message.created_at.asc())
    )
    messages = result.scalars().all()

    return [
        MessageOut(
            id=m.id,
            from_telegram_id=m.from_telegram_id,
            text=m.text,
            created_at=m.created_at,
        ) for m in messages
    ]


@router.post("/{match_id}/messages", response_model=MessageOut)
async def send_message(
    match_id: int,
    body: MessageSend,
    auth: dict = Depends(get_telegram_user),
    session: AsyncSession = Depends(get_session),
):
    telegram_id = await _resolve_telegram_id(auth)
    if not telegram_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No telegram_id")

    me = await session.execute(select(User).where(User.telegram_id == telegram_id))
    me_user = me.scalar_one_or_none()
    if not me_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    match = await session.get(Match, match_id)
    if not match:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match not found")

    if match.user1_id != me_user.id and match.user2_id != me_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your match")

    msg = Message(
        match_id=match_id,
        from_user_id=me_user.id,
        from_telegram_id=me_user.telegram_id,
        text=body.text,
    )
    session.add(msg)
    await session.commit()
    await session.refresh(msg)

    return MessageOut(
        id=msg.id,
        from_telegram_id=msg.from_telegram_id,
        text=msg.text,
        created_at=msg.created_at,
    )
