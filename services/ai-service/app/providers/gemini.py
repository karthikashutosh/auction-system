"""Google Gemini adapters: embeddings and chat (with function calling) from ONE API key."""
import json
import math
from typing import Any

import httpx

from app.providers.base import EmbeddingResult, ProviderError
from app.providers.chat import ChatMessage, ChatResponse, JsonObject, ToolCall, ToolSpec
from app.providers.http import get_http_client

BASE = "https://generativelanguage.googleapis.com/v1beta"

# Gemini accepts an OpenAPI-like subset; pydantic's JSON schema has extras it rejects.
_DROP = {"title", "format", "default", "$defs", "additionalProperties", "examples"}


def clean_schema(node: Any) -> Any:
    if isinstance(node, dict):
        return {k: clean_schema(v) for k, v in node.items() if k not in _DROP}
    if isinstance(node, list):
        return [clean_schema(v) for v in node]
    return node


async def _post(path: str, api_key: str, body: JsonObject) -> JsonObject:
    try:
        resp = await get_http_client().post(f"{BASE}/{path}", headers={"x-goog-api-key": api_key}, json=body)
    except httpx.HTTPError as exc:
        raise ProviderError(f"gemini transport error: {exc}") from exc
    if resp.status_code != 200:
        raise ProviderError(f"gemini {resp.status_code}: {resp.text[:200]}", status_code=resp.status_code)
    out: JsonObject = resp.json()
    return out


class GeminiEmbeddingProvider:
    name = "gemini"

    def __init__(self, api_key: str, model: str = "gemini-embedding-001", dimensions: int = 1536) -> None:
        self.api_key = api_key
        self.model = model
        self.dimensions = dimensions

    async def embed(self, texts: list[str], *, input_type: str = "document") -> EmbeddingResult:
        task = "RETRIEVAL_QUERY" if input_type == "query" else "RETRIEVAL_DOCUMENT"
        body: JsonObject = {
            "requests": [
                {
                    "model": f"models/{self.model}",
                    "content": {"parts": [{"text": t}]},
                    "taskType": task,
                    "outputDimensionality": self.dimensions,
                }
                for t in texts
            ]
        }
        data = await _post(f"models/{self.model}:batchEmbedContents", self.api_key, body)
        vectors: list[list[float]] = []
        for e in data["embeddings"]:
            v = [float(x) for x in e["values"]]
            norm = math.sqrt(sum(x * x for x in v)) or 1.0  # truncated Matryoshka vectors are not unit-length
            vectors.append([x / norm for x in v])
        # The API reports no usage for embeddings: estimate (~4 chars/token).
        return EmbeddingResult(vectors=vectors, tokens=sum(max(1, len(t) // 4) for t in texts))


def _to_gemini(messages: list[ChatMessage]) -> list[JsonObject]:
    out: list[JsonObject] = []
    for m in messages:
        if m.role == "user":
            out.append({"role": "user", "parts": [{"text": m.content}]})
        elif m.role == "assistant":
            parts: list[JsonObject] = []
            if m.content:
                parts.append({"text": m.content})
            for tc in m.tool_calls:
                fc: JsonObject = {"functionCall": {"name": tc.name, "args": tc.arguments}}
                if tc.provider_meta:
                    fc["thoughtSignature"] = tc.provider_meta
                parts.append(fc)
            out.append({"role": "model", "parts": parts})
        else:
            try:
                payload: Any = json.loads(m.content)
            except ValueError:
                payload = m.content
            part: JsonObject = {"functionResponse": {"name": m.tool_name, "response": {"output": payload}}}
            if out and out[-1]["role"] == "user" and out[-1].get("_tool"):
                out[-1]["parts"].append(part)
            else:
                out.append({"role": "user", "parts": [part], "_tool": True})
    for o in out:
        o.pop("_tool", None)
    return out


class GeminiChatProvider:
    name = "gemini"

    def __init__(self, api_key: str, model: str = "gemini-3.1-flash-lite") -> None:
        self.api_key = api_key
        self.model = model

    async def complete(
        self, *, system: str, messages: list[ChatMessage], tools: list[ToolSpec]
    ) -> ChatResponse:
        body: JsonObject = {
            "systemInstruction": {"parts": [{"text": system}]},
            "contents": _to_gemini(messages),
            "generationConfig": {"maxOutputTokens": 2048, "temperature": 0.2},
        }
        if tools:
            body["tools"] = [
                {
                    "functionDeclarations": [
                        {"name": t.name, "description": t.description, "parameters": clean_schema(t.input_schema)}
                        for t in tools
                    ]
                }
            ]
        data = await _post(f"models/{self.model}:generateContent", self.api_key, body)
        candidates = data.get("candidates") or []
        if not candidates:
            raise ProviderError(f"gemini returned no candidates: {json.dumps(data.get('promptFeedback', {}))[:200]}", status_code=502)
        parts = candidates[0].get("content", {}).get("parts", [])
        text = "".join(p["text"] for p in parts if "text" in p and not p.get("thought")) or None
        calls = [
            ToolCall(
                id=f"call_{i}",
                name=p["functionCall"]["name"],
                arguments=p["functionCall"].get("args", {}),
                provider_meta=p.get("thoughtSignature"),
            )
            for i, p in enumerate(p for p in parts if "functionCall" in p)
        ]
        usage = data.get("usageMetadata", {})
        return ChatResponse(
            text=None if calls else text,
            tool_calls=calls,
            input_tokens=int(usage.get("promptTokenCount", 0)),
            output_tokens=int(usage.get("candidatesTokenCount", 0)) + int(usage.get("thoughtsTokenCount", 0)),
        )
