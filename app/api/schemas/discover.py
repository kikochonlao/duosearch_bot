from pydantic import BaseModel
from typing import Optional
from app.api.schemas.profile import ProfileOut


class DiscoverCandidate(BaseModel):
    user: ProfileOut
    score: float = 0.0


class DiscoverResponse(BaseModel):
    candidates: list[DiscoverCandidate]
    total: int


class LikeRequest(BaseModel):
    to_telegram_id: int
    game: Optional[str] = None


class LikeResponse(BaseModel):
    is_match: bool
    match_id: Optional[int] = None
    matched_user: Optional[ProfileOut] = None


class SkipRequest(BaseModel):
    to_telegram_id: int
