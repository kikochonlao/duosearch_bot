from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton

from keyboards.games import get_game_roles


def get_roles_keyboard(game: str, is_last_game: bool = False) -> InlineKeyboardMarkup:
    roles = get_game_roles(game)

    role_buttons = [
        [InlineKeyboardButton(text=r, callback_data=f"role_{game}_{r.lower()}")]
        for r in roles
    ]

    nav_buttons = [
        [InlineKeyboardButton(text="➡ Следующая игра", callback_data="next_game")]
    ]
    if is_last_game:
        nav_buttons.append(
            [InlineKeyboardButton(text="✅ Готово", callback_data="roles_done")]
        )

    return InlineKeyboardMarkup(inline_keyboard=role_buttons + nav_buttons)
