import time
import json
import logging
from typing import Optional, Any
import redis.asyncio as aioredis
from app.config import settings

logger = logging.getLogger(__name__)

redis_client: Optional[aioredis.Redis] = None
_redis_retry_after: float = 0.0
REDIS_COOLDOWN_SECONDS = 30.0

# High-performance In-Memory TTL Cache (used strictly when Redis is unreachable)
_memory_cache: dict[str, tuple[float, Any]] = {}


def _mark_redis_down() -> None:
    global redis_client, _redis_retry_after
    redis_client = None
    _redis_retry_after = time.monotonic() + REDIS_COOLDOWN_SECONDS


async def get_redis_client() -> Optional[aioredis.Redis]:
    global redis_client, _redis_retry_after
    if time.monotonic() < _redis_retry_after:
        return None
    if redis_client is None:
        try:
            redis_client = aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=0.2
            )
            _redis_retry_after = 0.0
        except Exception:
            _mark_redis_down()
    return redis_client


async def get_cache(key: str) -> Optional[Any]:
    # 1. Use Redis as single source of truth when reachable
    client = await get_redis_client()
    if client is not None:
        try:
            data = await client.get(key)
            if data is not None:
                return json.loads(data)
            return None
        except Exception:
            _mark_redis_down()

    # 2. In-memory fallback only when Redis is unavailable
    now = time.time()
    if key in _memory_cache:
        expire_at, value = _memory_cache[key]
        if now < expire_at:
            return value
        _memory_cache.pop(key, None)
    return None


async def set_cache(key: str, value: Any, expire_seconds: int = 180) -> None:
    client = await get_redis_client()
    if client is not None:
        try:
            json_data = json.dumps(value, default=str)
            await client.set(key, json_data, ex=expire_seconds)
            _memory_cache.pop(key, None)
            return
        except Exception:
            _mark_redis_down()

    # Fallback store in in-memory cache only if Redis is unavailable
    _memory_cache[key] = (time.time() + expire_seconds, value)


async def invalidate_cache(key_prefix: str) -> None:
    # 1. Always clear matching keys in local memory cache
    keys_to_del = [k for k in _memory_cache if k.startswith(key_prefix)]
    for k in keys_to_del:
        _memory_cache.pop(k, None)

    # 2. Clear in Redis if reachable
    client = await get_redis_client()
    if client is not None:
        try:
            keys = await client.keys(f"{key_prefix}*")
            if keys:
                await client.delete(*keys)
        except Exception:
            _mark_redis_down()
