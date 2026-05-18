from dataclasses import dataclass
from typing import Dict, Optional

from keyboards.ranks import rank_to_score


@dataclass
class GameProfile:
    game: str
    roles: Dict[str, str]  # {"mid": "Archon 3"} for role-based games
    rank: Optional[str] = None  # "Global Elite" for non-role games

    def to_dict(self) -> dict:
        return {"game": self.game, "roles": self.roles, "rank": self.rank}

    @property
    def avg_rank_score(self) -> float:
        if self.roles:
            scores = [rank_to_score(self.game, r) for r in self.roles.values() if rank_to_score(self.game, r) > 0]
            return sum(scores) / len(scores) if scores else 0.0
        if self.rank:
            return rank_to_score(self.game, self.rank)
        return 0.0

    def role_rank_score(self, role: str) -> float:
        r = self.roles.get(role, "")
        return rank_to_score(self.game, r)


@dataclass
class User:
    id: int
    telegram_id: int
    name: str
    age: int
    gender: str
    language: str
    region: str
    games: Dict[str, GameProfile]
    username: Optional[str] = None
    bio: Optional[str] = None
    photo_url: Optional[str] = None
    looking_for: str = "any"
    rating: int = 1000
    is_banned: int = 0
