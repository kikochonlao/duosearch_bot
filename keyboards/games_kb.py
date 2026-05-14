from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton

from keyboards.ranks import RANKS


def games_keyboard() -> InlineKeyboardMarkup:
    keys = list(RANKS.keys())
    buttons = []
    for i in range(0, len(keys), 2):
        row = []
        for j in range(2):
            if i + j < len(keys):
                g = keys[i + j]
                buttons.append(InlineKeyboardButton(
                    text=RANKS[g]["display"],
                    callback_data=f"game_{g}"
                ))
        buttons.append(row)
    buttons.append([InlineKeyboardButton(
        text="Готово",
        callback_data="games_done"
    )])
    return InlineKeyboardMarkup(inline_keyboard=buttons)
