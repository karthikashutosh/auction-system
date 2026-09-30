import httpx

from app.providers.base import ProviderError
from app.providers.chat import ChatMessage, ChatResponse, JsonObject, ToolCall, ToolSpec
from app.providers.http import get_http_client


def _to_anthropic(messages: list[ChatMessage]) -> list[JsonObject]:
    out: list[JsonObject] = []
    for m in messages:
        if m.role == "user":
            out.append({"role": "user", "content": m.content})
        elif m.role == "assistant":
            blocks: list[JsonObject] = []
            if m.content:
                blocks.append({"type": "text", "text": m.content})
            for tc in m.tool_calls:
                blocks.append({"type": "tool_use", "id": tc.id, "name": tc.name, "input": tc.arguments})
            out.append({"role": "assistant", "content": blocks})
        else:
            block: JsonObject = {"type": "tool_result", "tool_use_id": m.tool_call_id, "content": m.content}
            # consecutive tool results must share one user turn
            if out and out[-1]["role"] == "user" and isinstance(out[-1]["content"], list):
                out[-1]["content"].append(block)
            else:
                out.append({"role": "user", "content": [block]})
    return out


class AnthropicChatProvider:
    name = "anthropic"

    def __init__(self, api_key: str, model: str) -> None:
        self.api_key = api_key
        self.model = model

    async def complete(
        self, *, system: str, messages: list[ChatMessage], tools: list[ToolSpec]
    ) -> ChatResponse:
        payload: JsonObject = {
            "model": self.model,
            "max_tokens": 1024,
            "system": system,
            "messages": _to_anthropic(messages),
        }
        if tools:
            payload["tools"] = [
                {"name": t.name, "description": t.description, "input_schema": t.input_schema} for t in tools
            ]
        try:
            resp = await get_http_client().post(
                "https://api.anthropic.com/v1/messages",
                headers={"x-api-key": self.api_key, "anthropic-version": "2023-06-01"},
                json=payload,
            )
        except httpx.HTTPError as exc:
            raise ProviderError(f"anthropic transport error: {exc}") from exc
        if resp.status_code != 200:
            raise ProviderError(f"anthropic {resp.status_code}: {resp.text[:200]}", status_code=resp.status_code)
        body = resp.json()
        text = "".join(b["text"] for b in body["content"] if b["type"] == "text") or None
        calls = [
            ToolCall(id=b["id"], name=b["name"], arguments=b["input"])
            for b in body["content"]
            if b["type"] == "tool_use"
        ]
        usage = body.get("usage", {})
        return ChatResponse(
            text=text,
            tool_calls=calls,
            input_tokens=int(usage.get("input_tokens", 0)),
            output_tokens=int(usage.get("output_tokens", 0)),
        )
