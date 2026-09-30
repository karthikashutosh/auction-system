from typing import Any, Literal, Protocol

from pydantic import BaseModel, Field

JsonObject = dict[str, Any]


class ToolSpec(BaseModel):
    name: str
    description: str
    input_schema: JsonObject


class ToolCall(BaseModel):
    id: str
    name: str
    arguments: JsonObject = Field(default_factory=dict)
    # Opaque provider state that must be echoed back (Gemini 3 thought signatures).
    provider_meta: str | None = None


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "tool"]
    content: str = ""
    tool_calls: list[ToolCall] = Field(default_factory=list)
    tool_call_id: str | None = None
    tool_name: str | None = None


class ChatResponse(BaseModel):
    """Either text (final answer) or a tool-call request; both carry usage."""

    text: str | None = None
    tool_calls: list[ToolCall] = Field(default_factory=list)
    input_tokens: int = 0
    output_tokens: int = 0


class ChatProvider(Protocol):
    name: str
    model: str

    async def complete(
        self, *, system: str, messages: list[ChatMessage], tools: list[ToolSpec]
    ) -> ChatResponse: ...
