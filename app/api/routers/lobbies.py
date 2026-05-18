from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_telegram_user, resolve_telegram_id
from app.api.deps.db import get_session
from app.api.schemas.lobbies import (
    LobbyCreate, LobbyOut, LobbyDetailOut, LobbyMemberOut,
    LobbyMessageOut, LobbyMessageSend, LobbyListResponse,
)
from db.repositories.lobby_repo import LobbyRepository

router = APIRouter()


@router.post("", response_model=LobbyOut)
async def create_lobby(
    body: LobbyCreate,
    auth: dict = Depends(get_telegram_user),
    session: AsyncSession = Depends(get_session),
):
    telegram_id = await resolve_telegram_id(auth)
    if not telegram_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No telegram_id")

    repo = LobbyRepository(session)
    lobby = await repo.create_lobby(
        telegram_id, body.game, body.title,
        body.description, body.max_players, body.is_public,
    )
    if not lobby:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    from db.models.user import User

    await session.commit()
    cnt = await repo._member_count(lobby.id)
    creator = await session.get(User, lobby.creator_id)
    return LobbyOut(
        id=lobby.id, creator_id=lobby.creator_id, game=lobby.game,
        title=lobby.title, description=lobby.description,
        max_players=lobby.max_players, is_public=lobby.is_public,
        status=lobby.status, member_count=cnt,
        creator_name=creator.name if creator else "?",
        created_at=lobby.created_at,
    )


@router.get("", response_model=LobbyListResponse)
async def list_lobbies(
    game: str = '',
    auth: dict = Depends(get_telegram_user),
    session: AsyncSession = Depends(get_session),
):
    telegram_id = await resolve_telegram_id(auth)
    if not telegram_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No telegram_id")

    repo = LobbyRepository(session)
    lobbies = await repo.list_open_lobbies(game)

    return LobbyListResponse(lobbies=[
        LobbyOut(
            id=lb.id, creator_id=lb.creator_id, game=lb.game,
            title=lb.title, description=lb.description,
            max_players=lb.max_players, is_public=lb.is_public,
            status=lb.status, member_count=cnt,
            creator_name=creator_name,
            created_at=lb.created_at,
        ) for lb, cnt, creator_name in lobbies
    ])


@router.get("/mine", response_model=LobbyListResponse)
async def my_lobbies(
    auth: dict = Depends(get_telegram_user),
    session: AsyncSession = Depends(get_session),
):
    telegram_id = await resolve_telegram_id(auth)
    if not telegram_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No telegram_id")

    repo = LobbyRepository(session)
    lobbies = await repo.get_my_lobbies(telegram_id)

    return LobbyListResponse(lobbies=[
        LobbyOut(
            id=lb.id, creator_id=lb.creator_id, game=lb.game,
            title=lb.title, description=lb.description,
            max_players=lb.max_players, is_public=lb.is_public,
            status=lb.status, member_count=cnt,
            creator_name=creator_name,
            created_at=lb.created_at,
        ) for lb, cnt, creator_name in lobbies
    ])


@router.get("/{lobby_id}", response_model=LobbyDetailOut)
async def get_lobby(
    lobby_id: int,
    auth: dict = Depends(get_telegram_user),
    session: AsyncSession = Depends(get_session),
):
    await resolve_telegram_id(auth)

    repo = LobbyRepository(session)
    lobby = await repo.get_lobby(lobby_id)
    if not lobby:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lobby not found")

    from db.models.user import User
    members = await repo.get_members(lobby_id)
    creator = await session.get(User, lobby.creator_id)

    return LobbyDetailOut(
        id=lobby.id, creator_id=lobby.creator_id, game=lobby.game,
        title=lobby.title, description=lobby.description,
        max_players=lobby.max_players, is_public=lobby.is_public,
        status=lobby.status,
        member_count=len([m for m, _ in members if m.status == "approved"]),
        creator_name=creator.name if creator else "?",
        members=[
            LobbyMemberOut(
                id=m.id, user_id=u.id, name=u.name,
                telegram_id=u.telegram_id,
                role=m.role, status=m.status, joined_at=m.joined_at,
            ) for m, u in members
        ],
        created_at=lobby.created_at,
    )


@router.post("/{lobby_id}/join")
async def join_lobby(
    lobby_id: int,
    auth: dict = Depends(get_telegram_user),
    session: AsyncSession = Depends(get_session),
):
    telegram_id = await resolve_telegram_id(auth)
    if not telegram_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No telegram_id")

    repo = LobbyRepository(session)
    ok, msg = await repo.join_lobby(lobby_id, telegram_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

    await session.commit()
    return {"ok": True, "message": msg}


@router.post("/{lobby_id}/leave")
async def leave_lobby(
    lobby_id: int,
    auth: dict = Depends(get_telegram_user),
    session: AsyncSession = Depends(get_session),
):
    telegram_id = await resolve_telegram_id(auth)
    if not telegram_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No telegram_id")

    repo = LobbyRepository(session)
    ok = await repo.leave_lobby(lobby_id, telegram_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Not a member")

    await session.commit()
    return {"ok": True}


@router.post("/{lobby_id}/approve/{user_id}")
async def approve_member(
    lobby_id: int, user_id: int,
    auth: dict = Depends(get_telegram_user),
    session: AsyncSession = Depends(get_session),
):
    telegram_id = await resolve_telegram_id(auth)
    if not telegram_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No telegram_id")

    repo = LobbyRepository(session)
    ok = await repo.approve_member(lobby_id, telegram_id, user_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot approve")

    await session.commit()
    return {"ok": True}


@router.post("/{lobby_id}/kick/{user_id}")
async def kick_member(
    lobby_id: int, user_id: int,
    auth: dict = Depends(get_telegram_user),
    session: AsyncSession = Depends(get_session),
):
    telegram_id = await resolve_telegram_id(auth)
    if not telegram_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No telegram_id")

    repo = LobbyRepository(session)
    ok = await repo.kick_member(lobby_id, telegram_id, user_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot kick")

    await session.commit()
    return {"ok": True}


@router.post("/{lobby_id}/close")
async def close_lobby(
    lobby_id: int,
    auth: dict = Depends(get_telegram_user),
    session: AsyncSession = Depends(get_session),
):
    telegram_id = await resolve_telegram_id(auth)
    if not telegram_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No telegram_id")

    repo = LobbyRepository(session)
    ok = await repo.close_lobby(lobby_id, telegram_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot close")

    await session.commit()
    return {"ok": True}


@router.get("/{lobby_id}/messages", response_model=list[LobbyMessageOut])
async def get_lobby_messages(
    lobby_id: int,
    auth: dict = Depends(get_telegram_user),
    session: AsyncSession = Depends(get_session),
):
    telegram_id = await resolve_telegram_id(auth)
    if not telegram_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No telegram_id")

    repo = LobbyRepository(session)
    member = await repo.is_member(lobby_id, telegram_id)
    if not member or member.status != "approved":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member")

    messages = await repo.get_messages(lobby_id)

    from db.models.user import User
    result = []
    for msg in messages:
        user = await session.get(User, msg.user_id)
        result.append(LobbyMessageOut(
            id=msg.id, user_id=msg.user_id,
            name=user.name if user else "?",
            text=msg.text, created_at=msg.created_at,
        ))
    return result


@router.post("/{lobby_id}/messages", response_model=LobbyMessageOut)
async def send_lobby_message(
    lobby_id: int, body: LobbyMessageSend,
    auth: dict = Depends(get_telegram_user),
    session: AsyncSession = Depends(get_session),
):
    telegram_id = await resolve_telegram_id(auth)
    if not telegram_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No telegram_id")

    repo = LobbyRepository(session)
    msg = await repo.send_message(lobby_id, telegram_id, body.text)
    if not msg:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member")

    await session.commit()

    from db.models.user import User
    user = await session.get(User, msg.user_id)
    return LobbyMessageOut(
        id=msg.id, user_id=msg.user_id,
        name=user.name if user else "?",
        text=msg.text, created_at=msg.created_at,
    )
