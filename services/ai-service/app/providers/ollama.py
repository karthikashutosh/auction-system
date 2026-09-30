"""Ollama adapters: free, local, no API key. Embeddings via /api/embed, chat (+tools) via /api/chat."""
import json
from typing import Any

import httpx

from app.providers.base import EmbeddingResult, ProviderError
from app.providers.chat import ChatMessage, ChatResponse, JsonObject, ToolCall, ToolSpec
from app.providers.gemini import clean_schema
from app.providers.http import get_http_client

LOCAL_TIMEOUT_S = 240.0  # small local models on a laptop are slow; never reuse the cloud timeout


async def _post(base: str, path: str, body: JsonObject) -> JsonObject:
    try:
        resp = await get_http_client().post(f"{base.rstrip('/')}{path}", json=body, timeout=LOCAL_TIMEOUT_S)
    except httpx.HTTPError as exc:
        raise ProviderError(f"ollama unreachable at {base}: {exc}") from exc
    if resp.status_code != 200:
        raise ProviderError(f"ollama {resp.status_code}: {resp.text[:200]}", status_code=resp.status_code)
    out: JsonObject = resp.json()
    return out


class OllamaEmbeddingProvider:
    """Native dimension is model-specific (nomic-embed-text: 768). Vectors are zero-padded to the
    column width (1536); cosine distance is unchanged by zero padding."""

    name = "ollama"

    def __init__(self, base_url: str, model: str = "nomic-embed-text", dimensions: int = 1536) -> None:
        self.base_url = base_url
        self.model = model
        self.dimensions = dimensions

    def _prefix(self, input_type: str) -> str:
        if "nomic" in self.model:  # nomic models are trained with task prefixes
            return "search_query: " if input_type == "query" else "search_document: "
        return ""

    async def embed(self, texts: list[str], *, input_type: str = "document") -> EmbeddingResult:
        prefix = self._prefix(input_type)
        data = await _post(self.base_url, "/api/embed", {"model": self.model, "input": [prefix + t for t in texts]})
        vectors: list[list[float]] = []
        for v in data["embeddings"]:
            if len(v) > self.dimensions:
                raise ProviderError(f"ollama model '{self.model}' returns {len(v)} dims, more than the {self.dimensions}-d column")
            vectors.append([float(x) for x in v] + [0.0] * (self.dimensions - len(v)))
        return EmbeddingResult(vectors=vectors, tokens=int(data.get("prompt_eval_count", 0)))


def _to_ollama(system: str, messages: list[ChatMessage]) -> list[JsonObject]:
    out: list[JsonObject] = [{"role": "system", "content": system}]
    for m in messages:
        if m.role == "assistant":
            msg: JsonObject = {"role": "assistant", "content": m.content}
            if m.tool_calls:
                msg["tool_calls"] = [{"function": {"name": tc.name, "arguments": tc.arguments}} for tc in m.tool_calls]
            out.append(msg)
        elif m.role == "tool":
            out.append({"role": "tool", "tool_name": m.tool_name, "content": m.content})
        else:
            out.append({"role": "user", "content": m.content})
    return out


class OllamaChatProvider:
    name = "ollama"

    def __init__(self, base_url: str, model: str = "qwen3:4b") -> None:
        self.base_url = base_url
        self.model = model

    async def complete(
        self, *, system: str, messages: list[ChatMessage], tools: list[ToolSpec]
    ) -> ChatResponse:
        body: JsonObject = {
            "model": self.model,
            "messages": _to_ollama(system, messages),
            "stream": False,
            "think": False,  # qwen3 "thinking" would burn minutes on a laptop and pollutes JSON output
            "options": {"temperature": 0.2, "num_ctx": 8192},
        }
        if tools:
            body["tools"] = [
                {"type": "function", "function": {"name": t.name, "description": t.description, "parameters": clean_schema(t.input_schema)}}
                for t in tools
            ]
        data = await _post(self.base_url, "/api/chat", body)
        msg: dict[str, Any] = data.get("message", {})
        calls = []
        for i, tc in enumerate(msg.get("tool_calls") or []):
            args = tc["function"].get("arguments", {})
            calls.append(ToolCall(id=f"call_{i}", name=tc["function"]["name"], arguments=json.loads(args) if isinstance(args, str) else args))
        text = (msg.get("content") or "").strip() or None
        return ChatResponse(
            text=None if calls else text,
            tool_calls=calls,
            input_tokens=int(data.get("prompt_eval_count", 0)),
            output_tokens=int(data.get("eval_count", 0)),
        )
