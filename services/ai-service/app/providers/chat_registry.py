from app.core.config import Settings, settings
from app.providers.anthropic_chat import AnthropicChatProvider
from app.providers.base import ConfigurationError, ProviderError
from app.providers.chat import ChatMessage, ChatResponse, ToolSpec
from app.providers.chat import ChatProvider
from app.providers.gemini import GeminiChatProvider
from app.providers.chat_instrumentation import InstrumentedChat
from app.providers.ollama import OllamaChatProvider


class UnavailableChatProvider:
    """AI_PROVIDER names a vendor with no chat adapter here (openai, voyage): the service still boots
    for search/embeddings, and chat features (agent, valuation sentence) degrade / return 502."""

    name = "none"
    model = "none"

    def __init__(self, provider: str) -> None:
        self.provider = provider

    async def complete(self, *, system: str, messages: list[ChatMessage], tools: list[ToolSpec]) -> ChatResponse:
        raise ProviderError(
            f"no chat model configured for AI_PROVIDER={self.provider}; set CHAT_PROVIDER=gemini|ollama|anthropic",
            status_code=422,
        )


def build_chat_provider(cfg: Settings) -> ChatProvider:
    name = cfg.resolved_chat_provider
    if not name:
        raise ConfigurationError(
            "No AI provider configured. Set AI_PROVIDER (gemini | ollama | anthropic) and AI_API_KEY "
            "in services/ai-service/.env (ollama needs no key)."
        )
    if name == "anthropic":
        if not cfg.key_for("anthropic"):
            raise ConfigurationError(
                "Chat provider 'anthropic' selected but no key is set (ANTHROPIC_API_KEY or AI_API_KEY)."
            )
        return AnthropicChatProvider(cfg.key_for("anthropic"), cfg.anthropic_chat_model)
    if name == "gemini":
        if not cfg.key_for("gemini"):
            raise ConfigurationError(
                "Chat provider 'gemini' selected but AI_API_KEY is not set. "
                "Set AI_API_KEY (a Gemini API key)."
            )
        return GeminiChatProvider(cfg.key_for("gemini"), cfg.gemini_chat_model)
    if name in ("openai", "voyage"):
        return UnavailableChatProvider(name)
    if name == "ollama":
        return OllamaChatProvider(cfg.ollama_url, cfg.ollama_chat_model)
    raise ConfigurationError(f"Unknown CHAT_PROVIDER '{cfg.resolved_chat_provider}' (gemini | ollama | anthropic)")


chat: InstrumentedChat = InstrumentedChat(build_chat_provider(settings), settings)
