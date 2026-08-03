class RetrieverException(Exception):
    """Base exception for all framework errors."""
    pass

class InitializationException(RetrieverException):
    """Failure during BrowserContext.start()."""
    pass

class DriverException(RetrieverException):
    """A fatal error within the BrowserDriver."""
    pass

class NavigationException(RetrieverException):
    """A non-fatal error during a get() operation (e.g., timeout)."""
    pass

class ProviderNotFoundException(RetrieverException):
    """Raised when no suitable provider can be found for a given URL."""
    def __init__(self, url: str):
        self.url = url
        super().__init__(f"No provider found for URL: {url}")
