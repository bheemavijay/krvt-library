import random
from .policy import RetryPolicy
from .failure_type import FailureType

class ExponentialBackoffRetry(RetryPolicy):
    """
    A retry policy that uses exponential backoff with jitter.
    """
    def __init__(
        self,
        max_attempts: int = 3,
        initial_delay: float = 0.5,
        multiplier: float = 2.0,
        max_delay: float = 30.0,
        jitter: bool = True,
    ):
        self.max_attempts = max_attempts
        self.initial_delay = initial_delay
        self.multiplier = multiplier
        self.max_delay = max_delay
        self.jitter = jitter

        self.retriable_failures = {
            FailureType.NETWORK,
            FailureType.SERVER,
            FailureType.RATE_LIMIT,
        }

    def should_retry(
        self,
        attempt: int,
        failure_type: FailureType,
    ) -> bool:
        """
        Retries only for retriable failure types and up to max_attempts.
        """
        return attempt < self.max_attempts and failure_type in self.retriable_failures

    def delay_seconds(
        self,
        attempt: int,
    ) -> float:
        """
        Calculates the delay using exponential backoff.
        """
        delay = self.initial_delay * (self.multiplier ** (attempt - 1))
        delay = min(delay, self.max_delay)

        if self.jitter:
            delay = random.uniform(0, delay)

        return delay
