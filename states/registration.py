from aiogram.fsm.state import StatesGroup, State


class RegistrationState(StatesGroup):
    name = State()
    age = State()
    gender = State()
    languages = State()
    region = State()
    looking_for = State()
    games = State()
    roles = State()
    rank = State()


class EditState(StatesGroup):
    name = State()
    age = State()
    gender = State()
    languages = State()
    region = State()
    games = State()
