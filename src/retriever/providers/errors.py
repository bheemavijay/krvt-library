class ProviderException(Exception):
    """Base exception for provider-related errors."""
    pass

class UnsupportedUrl(ProviderException):
    """Raised when no provider can handle the given URL."""
    pass

class ProviderUnavailable(ProviderException):
    """Raised when a provider is unavailable or fails to load."""
    pass

class ProviderBlocked(ProviderException):
    """Raised when a provider is blocked (e.g., by Cloudflare)."""
    pass

class ParsingFailed(ProviderException):
    """Raised when a provider fails to parse a page."""
    pass

class ProviderVersionMismatch(ProviderException):
    """Raised when a provider's API version is incompatible with the framework."""
    pass
