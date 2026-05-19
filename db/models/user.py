import json
from datetime import datetime

from sqlalchemy import Column, Integer, String, BigInteger, DateTime, Text

from db.base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    telegram_id = Column(BigInteger, unique=True, nullable=False, index=True)
    username = Column(String, nullable=True)
    name = Column(String, nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String, nullable=False, default="M")
    language = Column(String, nullable=False, default="ru")
    region = Column(String, nullable=False, default="cis")
    bio = Column(Text, nullable=True)
    photo_url = Column(String, nullable=True)
    looking_for = Column(String, nullable=False, default="any")
    games = Column(Text, nullable=False, default="{}")
    created_at = Column(DateTime, default=datetime.utcnow)
    is_banned = Column(Integer, nullable=False, default=0)
    steam_id = Column(String, nullable=True)
    blog = Column(Text, nullable=True)

    def set_games(self, games_data: dict[str, dict]):
        self.games = json.dumps(games_data, ensure_ascii=False)

    def get_games(self) -> dict[str, dict]:
        if isinstance(self.games, str):
            return json.loads(self.games)
        return self.games or {}

    def get_game_profile(self, game: str) -> dict | None:
        return self.get_games().get(game)

    def __repr__(self):
        return f"<User telegram_id={self.telegram_id} name={self.name}>"
