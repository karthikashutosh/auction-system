from pydantic import BaseModel, Field


class EmbedRequest(BaseModel):
    text: str = Field(min_length=1, max_length=20_000)
    feature: str = "embed"


class EmbedResponse(BaseModel):
    embedding: list[float]
    provider: str
    model: str
    dimensions: int
    tokens: int


class EmbedBatchRequest(BaseModel):
    texts: list[str] = Field(min_length=1, max_length=128)
    feature: str = "embed_batch"


class EmbedBatchResponse(BaseModel):
    embeddings: list[list[float]]
    provider: str
    model: str
    dimensions: int
    tokens: int
