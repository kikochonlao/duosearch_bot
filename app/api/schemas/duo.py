from pydantic import BaseModel
from typing import Optional


class DuoStatusOut(BaseModel):
    match_id: int
    partner_name: str
    partner_photo: Optional[str] = None
    level: int
    level_name: str
    xp: int
    xp_next: int
    progress: float
    duo_name: Optional[str] = None
    created_at: str


class XpEventOut(BaseModel):
    id: int
    activity_type: str
    xp_awarded: int
    payload: Optional[str] = None
    created_at: str


class AchievementDef(BaseModel):
    key: str
    title: str
    description: str
    category: str
    rarity: str
    xp_reward: int
    unlocked: bool
    unlocked_at: Optional[str] = None


class MemoryOut(BaseModel):
    id: int
    memory_type: str
    title: str
    description: Optional[str] = None
    icon: str
    xp_earned: int
    rarity: str
    created_at: str


class AddXpBody(BaseModel):
    match_id: int
    activity_type: str
    payload: Optional[str] = None
