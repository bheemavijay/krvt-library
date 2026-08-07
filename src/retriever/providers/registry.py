import importlib
import inspect
import os
import re
from typing import Dict, Type, List

from .base import BaseProvider
from .manifest import ProviderManifest
from .info import ProviderInfo
from .factory import ProviderFactory
from .context import ProviderContext
from .errors import ProviderVersionMismatch, ProviderUnavailable, UnsupportedUrl

FRAMEWORK_API_VERSION = 1

class ProviderRegistry:
    """
    Discovers, validates, and manages provider plugins.
    """
    def __init__(self):
        self._discovered_classes: List[Type[BaseProvider]] = []
        self._providers: Dict[str, ProviderInfo] = {}
        self._is_initialized = False
        self._is_frozen = False

    def discover(self, path: str = "src/retriever/providers"):
        if self._is_frozen:
            raise RuntimeError("Registry is frozen.")

        for entry in os.scandir(path):
            if entry.is_dir() and not entry.name.startswith('__'):
                provider_module_path = f"{path.replace('/', '.')}.{entry.name}.provider"
                try:
                    module = importlib.import_module(provider_module_path)
                    for _, obj in inspect.getmembers(module, inspect.isclass):
                        if issubclass(obj, BaseProvider) and obj is not BaseProvider:
                            self._discovered_classes.append(obj)
                except (ImportError, AttributeError):
                    continue

    def validate(self):
        if self._is_frozen:
            raise RuntimeError("Registry is frozen.")

        for provider_class in self._discovered_classes:
            if not hasattr(provider_class, 'manifest'):
                # Or log a warning
                continue

            manifest: ProviderManifest = provider_class.manifest

            if manifest.api_version != FRAMEWORK_API_VERSION:
                raise ProviderVersionMismatch(
                    f"Provider '{manifest.id}' API version ({manifest.api_version}) "
                    f"is not compatible with framework API version ({FRAMEWORK_API_VERSION})."
                )

            # Add more validation logic here (e.g., unique ID)

    def initialize(self):
        if self._is_initialized:
            return

        for provider_class in self._discovered_classes:
            if hasattr(provider_class, 'manifest'):
                manifest = provider_class.manifest
                info = ProviderInfo(
                    manifest=manifest,
                    provider_class=provider_class,
                    module_path=provider_class.__module__
                )
                self._providers[manifest.id] = info

        self._is_initialized = True

    def freeze(self):
        self._is_frozen = True

    def resolve(self, url: str, context: ProviderContext) -> BaseProvider:
        if not self._is_initialized:
            raise RuntimeError("Registry must be initialized before use.")

        for info in self._providers.values():
            for pattern in info.manifest.url_patterns:
                if re.search(pattern, url):
                    return ProviderFactory.create(info, context)
        raise UnsupportedUrl(f"No provider found for URL: {url}")

    def get_provider(self, provider_id: str, context: ProviderContext) -> BaseProvider:
        if not self._is_initialized:
            raise RuntimeError("Registry must be initialized before use.")
        if provider_id not in self._providers:
            raise ProviderUnavailable(f"Provider '{provider_id}' not found.")

        info = self._providers[provider_id]
        return ProviderFactory.create(info, context)

    @property
    def providers(self) -> Dict[str, ProviderInfo]:
        return self._providers
