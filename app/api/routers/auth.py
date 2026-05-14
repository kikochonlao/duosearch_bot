from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.deps.auth import verify_telegram_init_data
from app.api.deps.db import get_session
from db.models.user import User

router = APIRouter()


@router.post("/login")
async def login(
    init_data: str,
    session: AsyncSession = Depends(get_session),
):
    data = verify_telegram_init_data(init_data)
    user_data = data.get("user") or {}

    import json
    try:
        user_obj = json.loads(user_data) if isinstance(user_data, str) else user_data
    except (json.JSONDecodeError, TypeError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user data")

    telegram_id = user_obj.get("id")
    username = user_obj.get("username") or user_obj.get("first_name")

    if not telegram_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No user id")

    result = await session.execute(select(User).where(User.telegram_id == telegram_id))
    user = result.scalar_one_or_none()

    if user and user.is_banned:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are banned")

    return {
        "ok": True,
        "telegram_id": telegram_id,
        "username": username,
        "is_registered": user is not None,
        "user_id": user.id if user else None,
    }
