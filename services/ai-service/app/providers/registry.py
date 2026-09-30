from app.core.config import Settings, settings
from app.providers.base import ConfigurationError, EmbeddingProvider
from app.providers.gemini import GeminiEmbeddingProvider
from app.providers.instrumentation import InstrumentedEmbedder
from app.providers.ollama import OllamaEmbeddingProvider
from app.providers.openai_embed import OpenAIEmbeddingProvider
from app.providers.voyage_embed import VoyageEmbeddingProvider


def build_provider(cfg: Settings) -> EmbeddingProvider:
    name = cfg.resolved_embedding_provider
    if not name:
        raise ConfigurationError(
            "No AI provider configured. Set AI_PROVIDER (gemini | ollama | openai | voyage) and AI_API_KEY "
            "in services/ai-service/.env (ollama needs no key)."
        )
    if name == "anthropic":
        raise ConfigurationError(
            "Anthropic has no embeddings model. Keep AI_PROVIDER=anthropic for chat and set "
            "EMBEDDING_PROVIDER to gemini | ollama | openai | voyage (with its own key)."
        )
    if name == "openai":
        if not cfg.key_for("openai"):
            raise ConfigurationError(
                "Embedding provider 'openai' selected but no key is set (OPENAI_API_KEY or AI_API_KEY). "
                "Set the key."
            )
        return OpenAIEmbeddingProvider(cfg.key_for("openai"), cfg.openai_embedding_model, cfg.embedding_dimensions)
    if name == "voyage":
        if not cfg.key_for("voyage"):
            raise ConfigurationError(
                "Embedding provider 'voyage' selected but no key is set (VOYAGE_API_KEY or AI_API_KEY). "
                "Set the key."
            )
        return VoyageEmbeddingProvider(cfg.key_for("voyage"), cfg.voyage_embedding_model, cfg.embedding_dimensions)
    if name == "gemini":
        if not cfg.key_for("gemini"):
            raise ConfigurationError(
                "Embedding provider 'gemini' selected but AI_API_KEY is not set. "
                "Set AI_API_KEY (a Gemini API key)."
            )
        return GeminiEmbeddingProvider(cfg.key_for("gemini"), cfg.gemini_embedding_model, cfg.embedding_dimensions)
    if name == "ollama":
        return OllamaEmbeddingProvider(cfg.ollama_url, cfg.ollama_embedding_model, cfg.embedding_dimensions)
    raise ConfigurationError(f"Unknown EMBEDDING_PROVIDER '{cfg.resolved_embedding_provider}' (gemini | ollama | openai | voyage)")


def build_embedder(cfg: Settings) -> InstrumentedEmbedder:
    return InstrumentedEmbedder(build_provider(cfg), cfg)


# Built at import time: a misconfigured service fails to boot.
embedder: InstrumentedEmbedder = build_embedder(settings)
