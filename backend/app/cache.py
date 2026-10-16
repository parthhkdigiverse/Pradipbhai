import time
import json
import logging
from typing import Optional, Any
import redis.asyncio as aioredis
from app.config import settings

logger = logging.getLogger(__name__)

redis_client: Optional[aioredis.Redis] = None
_redis_available = True

# High-performance In-Memory TTL Cache
_memory_cache: dict[str, tuple[float, Any]] = {}

async def get_redis_client() -> Optional[aioredis.Redis]:
    global redis_client, _redis_available
    if not _redis_available:
        return None
    if redis_client is None:
        try:
            redis_client = aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=0.2
            )
        except Exception:
            _redis_available = False
            redis_client = None
    return redis_client

async def get_cache(key: str) -> Optional[Any]:
    global _redis_available, redis_client
    # 1. Try Redis if marked available
    if _redis_available:
        try:
            client = await get_redis_client()
            if client:
                data = await client.get(key)
                if data:
                    return json.loads(data)
        except Exception:
            _redis_available = False
            redis_client = None

    # 2. In-memory fallback
    now = time.time()
    if key in _memory_cache:
        expire_at, value = _memory_cache[key]
        if now < expire_at:
            return value
        else:
            _memory_cache.pop(key, None)
    return None

async def set_cache(key: str, value: Any, expire_seconds: int = 180) -> None:
    global _redis_available, redis_client
    # 1. Store in in-memory cache
    _memory_cache[key] = (time.time() + expire_seconds, value)

    # 2. Also store in Redis if available
    if _redis_available:
        try:
            client = await get_redis_client()
            if client:
                json_data = json.dumps(value, default=str)
                await client.set(key, json_data, ex=expire_seconds)
        except Exception:
            _redis_available = False
            redis_client = None

async def invalidate_cache(key_prefix: str) -> None:
    global _redis_available, redis_client
    # 1. Clear matching keys in memory cache
    keys_to_del = [k for k in _memory_cache if k.startswith(key_prefix)]
    for k in keys_to_del:
        _memory_cache.pop(k, None)

    # 2. Clear in Redis if available
    if _redis_available:
        try:
            client = await get_redis_client()
            if client:
                keys = await client.keys(f"{key_prefix}*")
                if keys:
                    await client.delete(*keys)
        except Exception:
            _redis_available = False
            redis_client = None
