from typing import List, Dict, Type, Optional
from .registry import ProviderRegistry
from .base import BaseProvider
from .readnovelmtl.provider import ReadNovelMTLProvider
from src.retriever.exceptions.exceptions import ProviderNotFoundException
# Import future providers here
# from .mvlempyr.provider import MVLEMPYRProvider
# from .novelfull.provider import NovelFullProvider

class ProviderManager:
    _registry = ProviderRegistry()

    # --- Auto-register all known provider classes ---
    _registry.register(ReadNovelMTLProvider)
    # _registry.register(MVLEMPYRProvider)
    # _registry.register(NovelFullProvider)

    @staticmethod
    def resolve(url: str) -> BaseProvider:
        """
        Resolves a provider based on the URL.
        This is the primary entry point for the application.
        """
        provider = ProviderManager._registry.find_provider(url)
        if not provider:
            raise ProviderNotFoundException(url)
        return provider

    @staticmethod
    def get(provider_id: str) -> Optional[BaseProvider]:
        """Gets a provider instance by its unique ID."""
        return ProviderManager._registry.get(provider_id)

    @staticmethod
    def list() -> List[Dict[str, str]]:
        """Lists the IDs and names of all registered providers."""
        return ProviderManager._registry.list()

    @staticmethod
    def supports(url: str) -> bool:
        """Checks if any registered provider supports the given URL."""
        try:
            ProviderManager.resolve(url)
            return True
        except ProviderNotFoundException:
            return False
