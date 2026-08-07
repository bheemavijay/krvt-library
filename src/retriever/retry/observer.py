from abc import ABC, abstractmethod
from .context import RetryContext

class RetryObserver(ABC):
    """
    Abstract interface for observing retry lifecycle events.
    """

    @abstractmethod
    def retry_started(self, context: RetryContext):
        pass

    @abstractmethod
    def retry_attempt(self, context: RetryContext):
        pass

    @abstractmethod
    def retry_waiting(self, context: RetryContext, delay_seconds: float):
        pass

    @abstractmethod
    def retry_succeeded(self, context: RetryContext):
        pass

    @abstractmethod
    def retry_exhausted(self, context: RetryContext):
        pass
