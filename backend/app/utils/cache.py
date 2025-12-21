import json
import os
import time
from threading import Lock
from typing import Any, Callable, Dict, Tuple


class TTLCache:
    """Simple in-memory TTL cache for lightweight response caching."""

    def __init__(self, default_ttl: int = 300):
        self.default_ttl = default_ttl
        self._store: Dict[str, Tuple[float, Any]] = {}
        self._lock = Lock()

    def get(self, key: str) -> Any:
        with self._lock:
            entry = self._store.get(key)
            if not entry:
                return None
            expires_at, value = entry
            if expires_at < time.time():
                self._store.pop(key, None)
                return None
            return value

    def set(self, key: str, value: Any, ttl: int | None = None) -> None:
        duration = ttl if ttl is not None else self.default_ttl
        with self._lock:
            self._store[key] = (time.time() + duration, value)

    def invalidate(self, prefix: str | None = None) -> None:
        with self._lock:
            if prefix is None:
                self._store.clear()
                return
            keys_to_delete = [k for k in self._store if k.startswith(prefix)]
            for key in keys_to_delete:
                self._store.pop(key, None)


# Singleton cache instance for API responses
response_cache = TTLCache(default_ttl=300)


class RedisCache:
    """Optional Redis-backed cache; falls back gracefully if redis is unavailable."""

    def __init__(self, url: str, default_ttl: int = 300):
        try:
            import redis  # type: ignore
        except Exception:  # pragma: no cover - optional dependency
            self._client = None
            self.default_ttl = default_ttl
            return
        self.default_ttl = default_ttl
        self._client = redis.from_url(url)

    def available(self) -> bool:
        return self._client is not None

    def get(self, key: str) -> Any:
        if not self._client:
            return None
        val = self._client.get(key)
        if val is None:
            return None
        try:
            return json.loads(val)
        except (ValueError, TypeError):
            return val

    def set(self, key: str, value: Any, ttl: int | None = None):
        if not self._client:
            return
        if isinstance(value, (dict, list)):
            value = json.dumps(value)
        self._client.set(key, value, ex=ttl or self.default_ttl)

    def invalidate(self, prefix: str | None = None):
        if not self._client:
            return
        if prefix is None:
            self._client.flushdb()
        else:
            pattern = f"{prefix}*"
            for k in self._client.scan_iter(pattern):
                self._client.delete(k)

    def incr(self, key: str, ttl: int) -> int:
        """Increment a counter and ensure it expires.

        Returns the incremented value. If Redis is unavailable, returns 0.
        """
        if not self._client:
            return 0
        val = int(self._client.incr(key))
        if val == 1:
            # Set expiry only on first creation
            self._client.expire(key, ttl)
        return val

_redis_url = os.getenv("REDIS_URL")
redis_cache = RedisCache(_redis_url, default_ttl=300) if _redis_url else None


def cached_response(key: str, factory: Callable[[], Any], ttl: int | None = None) -> Any:
    """Return cached value if present, otherwise compute and store."""
    cached = response_cache.get(key)
    if cached is not None:
        return cached
    value = factory()
    response_cache.set(key, value, ttl=ttl)
    return value
