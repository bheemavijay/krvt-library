from abc import ABC, abstractmethod
from .failure_type import FailureType

class RetryPolicy(ABC):
    """
    Abstract interface for defining a retry policy.
    """

    @abstractmethod
    def should_retry(
        self,
        attempt: int,
        failure_type: FailureType,
    ) -> bool:
        """
        Determines if a retry should be attempted based on the failure type.
        """
        pass

    @abstractmethod
    def delay_seconds(
        self,
        attempt: int,
    ) -> float:
        """
        Calculates the delay in seconds before the next retry.
        """
        pass
