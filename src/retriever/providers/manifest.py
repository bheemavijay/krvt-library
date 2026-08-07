from dataclasses import dataclass
from typing import List
from .capabilities import ProviderCapabilities

@dataclass(frozen=True)
class ProviderManifest:
    """
    Defines the metadata for a provider plugin.
    This is an immutable object.
    """
    id: str
    name: str
    version: str
    author: str
    homepage: str
    url_patterns: List[str]
    supported_languages: List[str]
    capabilities: ProviderCapabilities
    api_version: int = 1
