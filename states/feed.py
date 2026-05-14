from aiogram.fsm.state import StatesGroup, State


class FeedState(StatesGroup):
    multi_games = State()
