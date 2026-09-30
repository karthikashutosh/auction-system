import httpx

_client: httpx.AsyncClient | None = None


def get_http_client(timeout_s: float | None = None) -> httpx.AsyncClient:
    """One shared async client: connection pooling, non-blocking I/O."""
    global _client
    if _client is None or _client.is_closed:
        from app.core.config import settings

        _client = httpx.AsyncClient(timeout=timeout_s or settings.provider_timeout_s)
    return _client


async def close_http_client() -> None:
    global _client
    if _client is not None and not _client.is_closed:
        await _client.aclose()
    _client = None
