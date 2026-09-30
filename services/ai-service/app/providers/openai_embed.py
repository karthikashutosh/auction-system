import httpx

from app.providers.base import EmbeddingResult, ProviderError
from app.providers.http import get_http_client


class OpenAIEmbeddingProvider:
    name = "openai"

    def __init__(self, api_key: str, model: str = "text-embedding-3-small", dimensions: int = 1536) -> None:
        self.api_key = api_key
        self.model = model
        self.dimensions = dimensions

    async def embed(self, texts: list[str], *, input_type: str = "document") -> EmbeddingResult:
        try:
            resp = await get_http_client().post(
                "https://api.openai.com/v1/embeddings",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={"model": self.model, "input": texts},
            )
        except httpx.HTTPError as exc:
            raise ProviderError(f"openai transport error: {exc}") from exc
        if resp.status_code != 200:
            raise ProviderError(f"openai {resp.status_code}: {resp.text[:200]}", status_code=resp.status_code)
        body = resp.json()
        data = sorted(body["data"], key=lambda d: d["index"])
        return EmbeddingResult(
            vectors=[d["embedding"] for d in data],
            tokens=int(body.get("usage", {}).get("total_tokens", 0)),
        )
