import asyncio
import random
import time
from collections.abc import Awaitable, Callable
from typing import TypeVar

from app.providers.base import ProviderError

T = TypeVar("T")


class CircuitOpenError(Exception):
    """Fast-fail while the breaker is open."""


class CircuitBreaker:
    """closed -> open after N consecutive failures -> half-open after reset_s -> closed on success."""

    def __init__(
        self,
        failure_threshold: int,
        reset_s: float,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self.failure_threshold = failure_threshold
        self.reset_s = reset_s
        self._clock = clock
        self._failures = 0
        self._opened_at: float | None = None

    @property
    def state(self) -> str:
        if self._opened_at is None:
            return "closed"
        if self._clock() - self._opened_at >= self.reset_s:
            return "half_open"
        return "open"

    def before_call(self) -> None:
        if self.state == "open":
            raise CircuitOpenError("circuit breaker is open")

    def record_success(self) -> None:
        self._failures = 0
        self._opened_at = None

    def record_failure(self) -> None:
        self._failures += 1
        if self.state == "half_open" or self._failures >= self.failure_threshold:
            self._opened_at = self._clock()


async def retry_with_backoff(
    fn: Callable[[], Awaitable[T]],
    *,
    max_retries: int,
    base_delay_s: float = 0.5,
    max_delay_s: float = 8.0,
    sleep: Callable[[float], Awaitable[None]] = asyncio.sleep,
    rand: Callable[[], float] = random.random,
) -> T:
    """Exponential backoff with full jitter; retries only retryable ProviderErrors."""
    attempt = 0
    while True:
        try:
            return await fn()
        except ProviderError as exc:
            if not exc.retryable or attempt >= max_retries:
                raise
            ceiling = min(max_delay_s, base_delay_s * (2**attempt))
            await sleep(rand() * ceiling)
            attempt += 1
