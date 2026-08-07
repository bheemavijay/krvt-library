from dataclasses import dataclass
from typing import Type
from .base import BaseProvider
from .manifest import ProviderManifest

@dataclass(frozen=True)
class ProviderInfo:
    """
    A container for a provider's manifest and its class.
    This is an immutable object.
    """
    manifest: ProviderManifest
    provider_class: Type[BaseProvider]
    module_path: str
