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
