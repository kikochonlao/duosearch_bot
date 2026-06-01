import hashlib
import hmac
import json
import time
from urllib.parse import parse_qs

from fastapi import Header, HTTPException, status

from config import settings


def verify_telegram_init_data(init_data: str) -> dict[str, str]:
    parsed = parse_qs(init_data)
    data = {k: v[0] for k, v in parsed.items()}

    received_hash = data.pop("hash", None)
    if not received_hash:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing hash")

    auth_date = data.get("auth_date")
    if auth_date:
        try:
            if time.time() - int(auth_date) > 86400:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Init data expired")
        except ValueError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid auth_date")

    items = sorted(data.items())
    data_check_string = "\n".join(f"{k}={v}" for k, v in items)

    secret_key = hmac.new(b"WebAppData", settings.BOT_TOKEN.encode(), hashlib.sha256).digest()
    expected_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(received_hash, expected_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid init data")

    data["hash"] = received_hash
    return data


async def get_telegram_user(init_data: str = Header(alias="x-telegram-init-data")) -> dict:
    if not init_data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing init data header")
    return verify_telegram_init_data(init_data)


async def resolve_telegram_id(auth: dict) -> int | None:
    user_data = auth.get("user")
    if isinstance(user_data, str):
        try:
            user_data = json.loads(user_data)
        except (json.JSONDecodeError, TypeError):
            pass
    if isinstance(user_data, dict):
        raw = user_data.get("id")
        if isinstance(raw, str):
            try:
                return int(json.loads(raw).get("id"))
            except (json.JSONDecodeError, TypeError):
                pass
        return int(raw) if raw else None
    return auth.get("telegram_id")
