import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import asyncpg

from app.core.config import settings

_pool: asyncpg.Pool | None = None
_init_lock = asyncio.Lock()


async def init_pool() -> None:
    global _pool
    async with _init_lock:  # concurrent first requests must not each create a pool
        if _pool is not None:
            return
        # min_size=0: the service boots (and /health passes) even if Postgres is down.
        _pool = await asyncpg.create_pool(settings.database_url, min_size=0, max_size=10, command_timeout=15)


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


@asynccontextmanager
async def acquire() -> AsyncIterator[asyncpg.Connection]:
    if _pool is None:
        await init_pool()
    assert _pool is not None
    async with _pool.acquire() as conn:
        yield conn


def to_pgvector(vec: list[float]) -> str:
    return "[" + ",".join(f"{x:.7g}" for x in vec) + "]"
