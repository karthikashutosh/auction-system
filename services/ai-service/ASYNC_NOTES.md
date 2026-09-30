# async in this service (Day 3)

- **async def helps** when a handler mostly *waits* on I/O: `embed`/`search` await the provider's HTTP call
  (`httpx.AsyncClient`) and Postgres (`asyncpg`). While one request waits, the event loop serves others.
- **Sync `def` is right** for `health()`: no I/O, returns instantly. FastAPI runs sync handlers in a threadpool,
  so blocking there is harmless; `async` would add nothing.
- **Blocking inside `async def` is worse than plain sync**: `requests.post()` or `time.sleep()` in an async
  handler freezes the *whole* event loop (every request), whereas a sync handler only ties up one worker thread.
- CPU work (the fake provider's hashing) is not helped by async at all; it would need a process pool.
