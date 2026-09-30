"""Day 4: embed one string with the configured provider and print the vector."""
import asyncio

from app.providers.registry import embedder


async def main() -> None:
    res = await embedder.embed(["vintage film camera"], feature="demo")
    vec = res.vectors[0]
    assert len(vec) == embedder.dimensions == 1536
    print(f"{embedder.name}/{embedder.model} dims={len(vec)} tokens={res.tokens}")
    print(vec[:8], "...")


asyncio.run(main())
