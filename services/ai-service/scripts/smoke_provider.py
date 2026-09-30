"""Verify the configured provider/key works before spending on a backfill.

    PYTHONPATH=. uv run python scripts/smoke_provider.py
"""
import asyncio

from app.providers.chat import ChatMessage, ToolSpec
from app.providers.chat_registry import chat
from app.providers.registry import embedder


async def main() -> None:
    e = await embedder.embed(["vintage film camera"], feature="smoke", input_type="query")
    assert len(e.vectors[0]) == embedder.dimensions
    print(f"embed OK   {embedder.name}:{embedder.model} dims={len(e.vectors[0])} tokens~{e.tokens}")
    tool = ToolSpec(
        name="getAccountMetadata",
        description="Facts about one user account.",
        input_schema={"type": "object", "properties": {"user_id": {"type": "string"}}, "required": ["user_id"]},
    )
    r = await chat.complete(
        system="You are a test. Call the tool for user 123.",
        messages=[ChatMessage(role="user", content="Look up user 123 using the tool.")],
        tools=[tool],
        feature="smoke",
    )
    ok = bool(r.tool_calls)
    print(f"chat  OK   {chat.name}:{chat.model} tool_call={'yes' if ok else 'NO (text: ' + str(r.text)[:60] + ')'} "
          f"tokens={r.input_tokens}+{r.output_tokens}")


asyncio.run(main())
