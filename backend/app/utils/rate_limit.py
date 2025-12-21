"""Small rate limiting helper (Redis-backed when available)."""

from __future__ import annotations

import time
from typing import Optional

from app.utils.cache import TTLCache, redis_cache


_local_counters = TTLCache(default_ttl=300)


def hit(key: str, *, limit: int, window_seconds: int) -> tuple[bool, int, int]:
    """Register a hit and determine if it is allowed.

    Returns: (allowed, current_count, reset_epoch_seconds)
    """
    now = int(time.time())
    reset_at = now + window_seconds

    if redis_cache and redis_cache.available():
        current = redis_cache.incr(key, ttl=window_seconds)
        # Redis expiry is server-side; approximate reset for UI/logging.
        return current <= limit, current, reset_at

    # Fallback: in-memory per-process counter
    bucket = _local_counters.get(key)
    if not bucket:
        _local_counters.set(key, {"count": 1, "reset_at": reset_at}, ttl=window_seconds)
        return True, 1, reset_at

    count = int(bucket.get("count", 0)) + 1
    reset_at = int(bucket.get("reset_at", reset_at))
    _local_counters.set(key, {"count": count, "reset_at": reset_at}, ttl=max(1, reset_at - now))
    return count <= limit, count, reset_at
