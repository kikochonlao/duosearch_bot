import sys
import asyncio
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routers import auth, profile, discover, matches, chat, games, lobbies

_bot_task: asyncio.Task | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _bot_task
    if asyncio.get_event_loop().is_running():
        try:
            from main import run_bot
            _bot_task = asyncio.create_task(run_bot())
        except Exception as e:
            import logging
            logging.getLogger("duosearch").warning(f"Bot not started in API mode: {e}")
    yield
    if _bot_task:
        _bot_task.cancel()
        try:
            await _bot_task
        except asyncio.CancelledError:
            pass


app = FastAPI(title="Duosearch Mini App", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(profile.router, prefix="/api/profile", tags=["profile"])
app.include_router(discover.router, prefix="/api/discover", tags=["discover"])
app.include_router(matches.router, prefix="/api/matches", tags=["matches"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(games.router, prefix="/api/games", tags=["games"])
app.include_router(lobbies.router, prefix="/api/lobbies", tags=["lobbies"])


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "bot_task_alive": _bot_task is not None and not _bot_task.done(),
    }

@app.get("/api/bot-status")
async def bot_status():
    if _bot_task is None:
        return {"status": "bot_task_not_created"}
    if _bot_task.done():
        exc = _bot_task.exception()
        return {"status": "bot_task_finished", "exception": str(exc) if exc else "No exception"}
    return {"status": "bot_task_running"}
