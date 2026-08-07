from dataclasses import dataclass
from src.retriever.core.context import BrowserContext
from src.retriever.runtime.services import RuntimeServices
from src.retriever.config.settings import Settings

@dataclass(frozen=True)
class ProviderContext:
    """
    Encapsulates the execution context for a provider.
    """
    browser: BrowserContext
    services: RuntimeServices
    settings: Settings
