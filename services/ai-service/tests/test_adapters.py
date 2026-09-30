import httpx
import pytest
import respx

from app.providers.base import ProviderError
from app.providers.http import close_http_client
from app.providers.openai_embed import OpenAIEmbeddingProvider
from app.providers.voyage_embed import VoyageEmbeddingProvider
from app.services.agent_tools import run_tool


@pytest.fixture(autouse=True)
async def _close_client():  # type: ignore[no-untyped-def]
    yield
    await close_http_client()


@respx.mock
async def test_openai_adapter_parses_vectors_and_usage() -> None:
    respx.post("https://api.openai.com/v1/embeddings").mock(
        return_value=httpx.Response(
            200,
            json={"data": [{"index": 1, "embedding": [0.2] * 1536}, {"index": 0, "embedding": [0.1] * 1536}], "usage": {"total_tokens": 9}},
        )
    )
    res = await OpenAIEmbeddingProvider("k").embed(["a", "b"])
    assert res.tokens == 9 and res.vectors[0][0] == 0.1 and len(res.vectors[1]) == 1536  # re-ordered by index


@respx.mock
async def test_openai_429_is_retryable_and_400_is_not() -> None:
    route = respx.post("https://api.openai.com/v1/embeddings")
    route.mock(return_value=httpx.Response(429, text="slow down"))
    with pytest.raises(ProviderError) as e:
        await OpenAIEmbeddingProvider("k").embed(["a"])
    assert e.value.retryable
    route.mock(return_value=httpx.Response(400, text="bad"))
    with pytest.raises(ProviderError) as e2:
        await OpenAIEmbeddingProvider("k").embed(["a"])
    assert not e2.value.retryable


@respx.mock
async def test_voyage_adapter_pads_to_column_width() -> None:
    respx.post("https://api.voyageai.com/v1/embeddings").mock(
        return_value=httpx.Response(200, json={"data": [{"index": 0, "embedding": [0.5] * 1024}], "usage": {"total_tokens": 4}})
    )
    res = await VoyageEmbeddingProvider("k").embed(["a"], input_type="query")
    assert len(res.vectors[0]) == 1536 and res.vectors[0][1024:] == [0.0] * 512


@respx.mock
async def test_transport_errors_are_retryable_provider_errors() -> None:
    respx.post("https://api.openai.com/v1/embeddings").mock(side_effect=httpx.ConnectError("refused"))
    with pytest.raises(ProviderError) as e:
        await OpenAIEmbeddingProvider("k").embed(["a"])
    assert e.value.retryable


async def test_run_tool_returns_structured_errors_instead_of_raising() -> None:
    unknown = await run_tool("nope", {})
    assert unknown.ok is False and unknown.code == "invalid_argument"  # type: ignore[union-attr]
    bad_args = await run_tool("getBidderHistory", {"user_id": "not-a-uuid"})
    assert bad_args.ok is False and bad_args.code == "invalid_argument"  # type: ignore[union-attr]
    injected = await run_tool("getBidTimeline", {"auction_id": "00000000-0000-0000-0000-000000000001"}, fail={"getBidTimeline"})
    assert injected.ok is False and injected.retryable is True  # type: ignore[union-attr]
