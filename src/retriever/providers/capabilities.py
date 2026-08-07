from dataclasses import dataclass
from src.retriever.models.enums import NavigationMode

@dataclass(frozen=True)
class ProviderCapabilities:
    """
    Defines the performance and feature capabilities of a provider.
    This is an immutable object.
    """
    max_parallel: int = 4
    requests_per_second: int = 2
    burst: int = 3
    timeout_seconds: int = 30
    supports_assets: bool = True
    supports_resume: bool = True
    cloudflare: bool = True
    navigation_mode: NavigationMode = NavigationMode.DEFAULT
