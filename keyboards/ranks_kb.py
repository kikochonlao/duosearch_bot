from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton

from keyboards.ranks import get_game_ranks


def rank_keyboard(game: str) -> InlineKeyboardMarkup:
    ranks = get_game_ranks(game)
    buttons = []

    for i in range(0, len(ranks), 3):
        row = []
        for r in ranks[i:i + 3]:
            row.append(InlineKeyboardButton(
                text=r,
                callback_data=f"rank_{game}_{r.replace(' ', '_')}"
            ))
        buttons.append(row)

    return InlineKeyboardMarkup(inline_keyboard=buttons)
