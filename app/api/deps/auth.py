import hashlib
import hmac
import json
from urllib.parse import parse_qs

from fastapi import Header, HTTPException, status

from config import settings


def verify_telegram_init_data(init_data: str) -> dict[str, str]:
    parsed = parse_qs(init_data)
    data = {k: v[0] for k, v in parsed.items()}

    received_hash = data.pop("hash", None)
    if not received_hash:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing hash")

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
    raw = auth.get("user", {}).get("id")
    if isinstance(raw, str):
        try:
            return int(json.loads(raw).get("id"))
        except (json.JSONDecodeError, TypeError):
            pass
    tid = int(raw) if raw else None
    return tid or auth.get("telegram_id")
