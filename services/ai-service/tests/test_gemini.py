import httpx
import pytest
import respx

from app.core.config import Settings
from app.providers.base import ConfigurationError, ProviderError
from app.providers.chat import ChatMessage, ToolCall, ToolSpec
from app.providers.chat_registry import build_chat_provider
from app.providers.gemini import GeminiChatProvider, GeminiEmbeddingProvider, clean_schema
from app.providers.http import close_http_client
from app.providers.registry import build_provider


@pytest.fixture(autouse=True)
async def _close():  # type: ignore[no-untyped-def]
    yield
    await close_http_client()


def test_one_provider_one_key_configures_everything() -> None:
    cfg = Settings(ai_provider="gemini", ai_api_key="k", embedding_provider="", chat_provider="")
    assert build_provider(cfg).name == "gemini"
    assert build_chat_provider(cfg).name == "gemini"


def test_gemini_without_key_refuses_to_boot() -> None:
    cfg = Settings(ai_provider="gemini", ai_api_key="", embedding_provider="", chat_provider="")
    with pytest.raises(ConfigurationError, match="AI_API_KEY"):
        build_provider(cfg)
    with pytest.raises(ConfigurationError, match="AI_API_KEY"):
        build_chat_provider(cfg)


def test_no_provider_configured_refuses_to_boot() -> None:
    cfg = Settings(ai_provider="", embedding_provider="", chat_provider="")
    with pytest.raises(ConfigurationError, match="No AI provider"):
        build_provider(cfg)
    with pytest.raises(ConfigurationError, match="No AI provider"):
        build_chat_provider(cfg)


def test_specific_setting_overrides_ai_provider() -> None:
    cfg = Settings(ai_provider="gemini", ai_api_key="k", embedding_provider="ollama", chat_provider="ollama")
    assert build_provider(cfg).name == "ollama" and build_chat_provider(cfg).name == "ollama"


def test_schema_cleaning_removes_unsupported_keys() -> None:
    raw = {"title": "X", "type": "object", "properties": {"id": {"type": "string", "format": "uuid", "title": "Id"}}, "required": ["id"]}
    assert clean_schema(raw) == {"type": "object", "properties": {"id": {"type": "string"}}, "required": ["id"]}


@respx.mock
async def test_gemini_embeddings_are_normalised_and_use_task_type() -> None:
    route = respx.post("https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents").mock(
        return_value=httpx.Response(200, json={"embeddings": [{"values": [3.0, 4.0] + [0.0] * 1534}]})
    )
    res = await GeminiEmbeddingProvider("k").embed(["hello world"], input_type="query")
    assert abs(res.vectors[0][0] - 0.6) < 1e-9 and len(res.vectors[0]) == 1536
    sent = route.calls[0].request
    assert b"RETRIEVAL_QUERY" in sent.content and sent.headers["x-goog-api-key"] == "k"


@respx.mock
async def test_gemini_chat_tool_call_roundtrip() -> None:
    route = respx.post("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent").mock(
        side_effect=[
            httpx.Response(200, json={"candidates": [{"content": {"parts": [{"functionCall": {"name": "getBidTimeline", "args": {"auction_id": "a"}}, "thoughtSignature": "SIG"}]}}],
                                       "usageMetadata": {"promptTokenCount": 10, "candidatesTokenCount": 3}}),
            httpx.Response(200, json={"candidates": [{"content": {"parts": [{"text": '{"verdict":"benign"}'}]}}],
                                       "usageMetadata": {"promptTokenCount": 20, "candidatesTokenCount": 5, "thoughtsTokenCount": 7}}),
        ]
    )
    p = GeminiChatProvider("k")
    tools = [ToolSpec(name="getBidTimeline", description="d", input_schema={"type": "object", "title": "T", "properties": {}})]
    r1 = await p.complete(system="s", messages=[ChatMessage(role="user", content="{}")], tools=tools)
    assert r1.tool_calls[0].name == "getBidTimeline" and r1.text is None and r1.input_tokens == 10
    history = [
        ChatMessage(role="user", content="{}"),
        ChatMessage(role="assistant", tool_calls=[r1.tool_calls[0]]),
        ChatMessage(role="tool", content='{"ok": true}', tool_call_id="call_0", tool_name="getBidTimeline"),
    ]
    r2 = await p.complete(system="s", messages=history, tools=tools)
    assert r2.text == '{"verdict":"benign"}' and r2.output_tokens == 12  # thinking tokens are billed as output
    body = route.calls[1].request.content
    assert b"functionResponse" in body and b'"thoughtSignature":"SIG"' in body.replace(b" ", b"")
    assert b"functionResponse" in body and b'"role":"model"' in body.replace(b" ", b"")


@respx.mock
async def test_gemini_errors_map_to_provider_errors() -> None:
    respx.post("https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents").mock(
        return_value=httpx.Response(429, text="quota")
    )
    with pytest.raises(ProviderError) as e:
        await GeminiEmbeddingProvider("k").embed(["x"])
    assert e.value.retryable


@respx.mock
async def test_ollama_embeddings_pad_and_prefix() -> None:
    from app.providers.ollama import OllamaEmbeddingProvider

    route = respx.post("http://o:11434/api/embed").mock(
        return_value=httpx.Response(200, json={"embeddings": [[0.5] * 768], "prompt_eval_count": 6})
    )
    res = await OllamaEmbeddingProvider("http://o:11434").embed(["camera"], input_type="query")
    assert len(res.vectors[0]) == 1536 and res.vectors[0][768:] == [0.0] * 768 and res.tokens == 6
    assert b"search_query: camera" in route.calls[0].request.content


@respx.mock
async def test_ollama_chat_tool_call_and_no_key_needed() -> None:
    from app.providers.ollama import OllamaChatProvider

    respx.post("http://o:11434/api/chat").mock(
        return_value=httpx.Response(200, json={"message": {"content": "", "tool_calls": [{"function": {"name": "getBidTimeline", "arguments": {"auction_id": "a"}}}]},
                                               "prompt_eval_count": 50, "eval_count": 9})
    )
    r = await OllamaChatProvider("http://o:11434").complete(system="s", messages=[ChatMessage(role="user", content="x")], tools=[])
    assert r.tool_calls[0].arguments == {"auction_id": "a"} and r.text is None and r.output_tokens == 9
    cfg = Settings(ai_provider="ollama", embedding_provider="", chat_provider="", ai_api_key="")
    assert build_provider(cfg).name == "ollama" and build_chat_provider(cfg).name == "ollama"
