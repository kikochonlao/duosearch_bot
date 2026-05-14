from pydantic import BaseModel
from datetime import datetime
from app.api.schemas.profile import ProfileOut


class MatchOut(BaseModel):
    id: int
    matched_user: ProfileOut
    created_at: datetime
    has_active_chat: bool = False
