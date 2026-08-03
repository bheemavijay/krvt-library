from typing import List, Optional, Type
from .base import BaseProvider

class ProviderRegistry:
    def __init__(self):
        self._providers: List[Type[BaseProvider]] = []
        self._instances: dict[str, BaseProvider] = {}

    def register(self, provider_class: Type[BaseProvider]):
        """Registers a provider class."""
        if provider_class not in self._providers:
            self._providers.append(provider_class)

    def _get_or_create_instance(self, provider_class: Type[BaseProvider]) -> BaseProvider:
        """Internal method to instantiate a provider only once."""
        provider_id = provider_class.id.fget(provider_class) # Access the property on the class
        if provider_id not in self._instances:
            self._instances[provider_id] = provider_class()
        return self._instances[provider_id]

    def get(self, provider_id: str) -> Optional[BaseProvider]:
        """Gets a provider instance by its unique ID."""
        for provider_class in self._providers:
            if provider_class.id.fget(provider_class) == provider_id:
                return self._get_or_create_instance(provider_class)
        return None

    def find_provider(self, url: str) -> Optional[BaseProvider]:
        """Finds the first registered provider that supports the given URL."""
        for provider_class in self._providers:
            # Temporarily instantiate to call supports(), but use the shared instance if it exists
            instance = self._get_or_create_instance(provider_class)
            if instance.supports(url):
                return instance
        return None

    def list(self) -> List[dict]:
        """Lists the IDs and names of all registered providers."""
        return [{"id": p.id.fget(p), "name": p.name.fget(p)} for p in self._providers]
