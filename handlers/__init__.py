from aiogram import Dispatcher

from . import registration
from . import feed
from . import profile
from . import matches
from . import help_handler


def register_all_handlers(dp: Dispatcher):
    dp.include_router(registration.router)
    dp.include_router(feed.router)
    dp.include_router(profile.router)
    dp.include_router(matches.router)
    dp.include_router(help_handler.router)
