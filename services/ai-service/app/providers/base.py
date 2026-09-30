from typing import Protocol

from pydantic import BaseModel


class ProviderError(Exception):
    """Raised by adapters. `retryable` drives the retry policy."""

    def __init__(self, message: str, *, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code

    @property
    def retryable(self) -> bool:
        return self.status_code is None or self.status_code == 429 or self.status_code >= 500


class ConfigurationError(RuntimeError):
    """Raised at boot when the service is misconfigured."""


class EmbeddingResult(BaseModel):
    vectors: list[list[float]]
    tokens: int


class EmbeddingProvider(Protocol):
    name: str
    model: str
    dimensions: int

    async def embed(self, texts: list[str], *, input_type: str = "document") -> EmbeddingResult: ...
