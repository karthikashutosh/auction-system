CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE auctions
    ADD COLUMN category TEXT NULL,
    ADD COLUMN embedding vector(1536) NULL,
    ADD COLUMN embedding_provider TEXT NULL,
    ADD COLUMN embedding_model TEXT NULL,
    ADD COLUMN embedded_at TIMESTAMPTZ NULL;

CREATE INDEX auctions_embedding_hnsw_idx
    ON auctions USING hnsw (embedding vector_cosine_ops);

CREATE INDEX auctions_category_idx ON auctions (category);
