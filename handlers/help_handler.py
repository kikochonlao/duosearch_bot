from aiogram import Router, F
from aiogram.filters import Command
from aiogram.types import Message

router = Router()

HELP_TEXT = (
    "📖 Команды Duosearch\n\n"
    "/start - Начать регистрацию\n"
    "/profile - Посмотреть/редактировать свой профиль\n"
    "/myfeed - Найти тиммейта (карточки по одной, ⬅➡ навигация)\n"
    "/feed game_name - Показать сразу несколько кандидатов\n"
    "/matches - Твои матчи и начало чата\n"
    "/likes - Кто лайкнул тебя\n"
    "/stats - Твоя статистика\n"
    "/stop - Завершить чат с тиммейтом\n"
    "/send_telegram - Обмениваться контактами (после /stop)\n"
    "/help - Эта справка\n\n"
    "🎮 Поддерживаемые игры:\n"
    "CS2, Dota 2, Valorant, Overwatch, Apex Legends,\n"
    "League of Legends, Fortnite, Rocket League, PUBG\n\n"
    "Как это работает:\n"
    "1. Зарегистрируйся через /start\n"
    "2. Ищи тиммейтов через /myfeed\n"
    "3. Лайкай игроков, которые понравились\n"
    "4. При взаимном лайке - откроется чат через бота!\n"
    "5. Общайтесь, затем /stop и /send_telegram для обмена контактами\n\n"
    "🛡 Модерация:\n"
    "• 🚫 Жалоба - пожаловаться на игрока\n"
    "• 🚷 Блок - заблокировать игрока\n"
    "• Авто-бан при 3+ жалобах"
)


@router.message(Command("help"))
async def help_command(message: Message):
    # Delete user's command message
    try:
        await message.delete()
    except:
        pass
    await message.answer(HELP_TEXT)
