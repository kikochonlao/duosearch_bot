from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class LobbyCreate(BaseModel):
    game: str
    title: str
    description: Optional[str] = None
    max_players: int = 2
    is_public: bool = True


class LobbyOut(BaseModel):
    id: int
    creator_id: int
    game: str
    title: str
    description: Optional[str] = None
    max_players: int
    is_public: bool
    status: str
    member_count: int
    creator_name: str
    created_at: datetime


class LobbyMemberOut(BaseModel):
    id: int
    user_id: int
    name: str
    telegram_id: int
    role: str
    status: str
    joined_at: datetime


class LobbyDetailOut(BaseModel):
    id: int
    creator_id: int
    game: str
    title: str
    description: Optional[str] = None
    max_players: int
    is_public: bool
    status: str
    member_count: int
    creator_name: str
    members: list[LobbyMemberOut]
    created_at: datetime


class LobbyMessageOut(BaseModel):
    id: int
    user_id: int
    name: str
    text: str
    created_at: datetime


class LobbyMessageSend(BaseModel):
    text: str


class LobbyListResponse(BaseModel):
    lobbies: list[LobbyOut]
