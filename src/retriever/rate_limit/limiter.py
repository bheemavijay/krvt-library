from abc import ABC, abstractmethod

class RateLimiter(ABC):
    """
    Abstract interface for a rate limiter.
    """

    @abstractmethod
    def acquire(self, scope: str, tokens: int = 1):
        """
        Acquires a token for a given scope. This call may block.
        """
        pass
