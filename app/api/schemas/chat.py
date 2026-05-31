from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class MessageOut(BaseModel):
    id: int
    from_telegram_id: int
    text: str
    created_at: datetime
    read_at: Optional[datetime] = None


class MessageSend(BaseModel):
    text: str


class ChatSessionOut(BaseModel):
    id: int
    match_id: int
    other_user: dict
    is_active: bool
    created_at: datetime
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None
