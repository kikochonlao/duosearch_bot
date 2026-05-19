from pydantic import BaseModel
from typing import Optional


class GameProfileSchema(BaseModel):
    rank: Optional[str] = None
    roles: dict[str, str] = {}


class SteamGameOut(BaseModel):
    app_id: int
    name: str
    playtime_hours: float
    logo_url: Optional[str] = None


class ProfileOut(BaseModel):
    id: int
    telegram_id: int
    username: Optional[str] = None
    name: str
    age: int
    gender: str
    language: str
    region: str
    bio: Optional[str] = None
    photo_url: Optional[str] = None
    looking_for: str
    games: dict[str, GameProfileSchema]
    is_banned: int
    steam_id: Optional[str] = None
    blog: Optional[str] = None


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    language: Optional[str] = None
    region: Optional[str] = None
    bio: Optional[str] = None
    photo_url: Optional[str] = None
    looking_for: Optional[str] = None
    games: Optional[dict[str, GameProfileSchema]] = None
    blog: Optional[str] = None


class BlockReportBody(BaseModel):
    target_telegram_id: int
    reason: Optional[str] = None


class SteamConnectBody(BaseModel):
    steam_id: str
