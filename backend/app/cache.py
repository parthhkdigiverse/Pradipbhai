import json
from typing import Optional, Any
import redis.asyncio as aioredis
from app.config import settings

redis_client: Optional[aioredis.Redis] = None

async def get_redis_client() -> Optional[aioredis.Redis]:
    global redis_client
    if redis_client is None:
        try:
            redis_client = aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=1.0
            )
        except Exception:
            redis_client = None
    return redis_client

async def get_cache(key: str) -> Optional[Any]:
    client = await get_redis_client()
    if not client:
        return None
    try:
        data = await client.get(key)
        if data:
            return json.loads(data)
    except Exception:
        pass
    return None

async def set_cache(key: str, value: Any, expire_seconds: int = 300) -> None:
    client = await get_redis_client()
    if not client:
        return
    try:
        json_data = json.dumps(value, default=str)
        await client.set(key, json_data, ex=expire_seconds)
    except Exception:
        pass

async def invalidate_cache(key: str) -> None:
    client = await get_redis_client()
    if not client:
        return
    try:
        await client.delete(key)
    except Exception:
        pass
