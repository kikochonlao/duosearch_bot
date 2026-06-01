import time
import logging
from collections import defaultdict
from fastapi import Request, HTTPException, status

logger = logging.getLogger("duosearch.ratelimit")


class RateLimiter:
    def __init__(self, max_requests: int = 60, window: int = 60):
        self.max_requests = max_requests
        self.window = window
        self._buckets: dict[str, list[float]] = defaultdict(list)

    async def __call__(self, request: Request):
        # Identify client by Telegram user ID or IP fallback
        user_id = None
        init_data = request.headers.get("x-telegram-init-data")
        if init_data:
            try:
                from urllib.parse import parse_qs
                parsed = parse_qs(init_data)
                user_str = parsed.get("user", [None])[0]
                if user_str:
                    import json
                    user_data = json.loads(user_str)
                    user_id = str(user_data.get("id"))
            except Exception:
                pass

        key = user_id or request.client.host if request.client else "unknown"
        now = time.time()
        self._buckets[key] = [t for t in self._buckets[key] if now - t < self.window]
        if len(self._buckets[key]) >= self.max_requests:
            logger.warning("Rate limit exceeded for %s", key)
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many requests")
        self._buckets[key].append(now)
