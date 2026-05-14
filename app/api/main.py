import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routers import auth, profile, discover, matches, chat, games


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


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


@app.get("/api/health")
async def health():
    return {"status": "ok"}
