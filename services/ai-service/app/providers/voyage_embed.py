import httpx

from app.providers.base import EmbeddingResult, ProviderError
from app.providers.http import get_http_client

VOYAGE_NATIVE_DIM = 1024


class VoyageEmbeddingProvider:
    """Voyage returns 1024-d vectors; zero-padded to the column width (1536).

    Zero padding leaves cosine distance unchanged, so vectors stay comparable
    within the same provider without a schema change.
    """

    name = "voyage"

    def __init__(self, api_key: str, model: str = "voyage-3-large", dimensions: int = 1536) -> None:
        self.api_key = api_key
        self.model = model
        self.dimensions = dimensions

    async def embed(self, texts: list[str], *, input_type: str = "document") -> EmbeddingResult:
        try:
            resp = await get_http_client().post(
                "https://api.voyageai.com/v1/embeddings",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={
                    "model": self.model,
                    "input": texts,
                    "input_type": "query" if input_type == "query" else "document",
                    "output_dimension": VOYAGE_NATIVE_DIM,
                },
            )
        except httpx.HTTPError as exc:
            raise ProviderError(f"voyage transport error: {exc}") from exc
        if resp.status_code != 200:
            raise ProviderError(f"voyage {resp.status_code}: {resp.text[:200]}", status_code=resp.status_code)
        body = resp.json()
        pad = [0.0] * (self.dimensions - VOYAGE_NATIVE_DIM)
        data = sorted(body["data"], key=lambda d: d["index"])
        return EmbeddingResult(
            vectors=[d["embedding"] + pad for d in data],
            tokens=int(body.get("usage", {}).get("total_tokens", 0)),
        )
