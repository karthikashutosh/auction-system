from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "auction-ai-service"
    environment: str = "development"
    port: int = 8001

    # Read-only Postgres role (ai_service). Never a write-capable user.
    database_url: str = "postgresql://ai_service:ai_service_dev@localhost:5433/auction_db"

    # ONE provider + ONE key for everything: AI_PROVIDER=gemini AI_API_KEY=...
    # (embeddings, valuation sentence, agent). Per-feature settings below override it.
    # Required: the service refuses to boot without a real provider.
    ai_provider: str = ""  # gemini | ollama | openai | anthropic
    ai_api_key: str = ""
    gemini_embedding_model: str = "gemini-embedding-001"
    gemini_chat_model: str = "gemini-3.1-flash-lite"
    # Local, free, keyless. From Docker use http://host.docker.internal:11434.
    ollama_url: str = "http://localhost:11434"
    ollama_chat_model: str = "qwen3:4b"
    ollama_embedding_model: str = "nomic-embed-text"

    # Embeddings. Empty = follow AI_PROVIDER.
    embedding_provider: str = ""
    openai_api_key: str = ""
    openai_embedding_model: str = "text-embedding-3-small"
    voyage_api_key: str = ""
    voyage_embedding_model: str = "voyage-3-large"
    embedding_dimensions: int = 1536

    # Chat (agent + valuation explanation).
    chat_provider: str = ""  # empty = follow AI_PROVIDER
    anthropic_api_key: str = ""
    anthropic_chat_model: str = "claude-sonnet-5-5"

    # Valuation retrieval. Cosine-distance scales differ per embedding model, so RETUNE per provider
    # and rerun scripts/backtest_valuation.py. Measured on gemini-embedding-001: genuinely similar
    # listings sit at <= 0.30, unrelated items at >= 0.41, so 0.35 separates them.
    valuation_max_distance: float = 0.35

    # Resilience
    provider_max_retries: int = 3
    provider_timeout_s: float = 20.0
    breaker_failure_threshold: int = 5
    breaker_reset_s: float = 30.0

    # Agent guardrails
    agent_max_turns: int = 8
    agent_max_cost_usd: float = 0.25

    @property
    def resolved_embedding_provider(self) -> str:
        return (self.embedding_provider or self.ai_provider).lower()

    @property
    def resolved_chat_provider(self) -> str:
        return (self.chat_provider or self.ai_provider).lower()

    def key_for(self, provider: str) -> str:
        specific = {"openai": self.openai_api_key, "voyage": self.voyage_api_key, "anthropic": self.anthropic_api_key}.get(provider, "")
        return specific or self.ai_api_key

    # Tracing
    otel_enabled: bool = False


settings = Settings()
