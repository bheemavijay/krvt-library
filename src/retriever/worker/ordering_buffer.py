from abc import ABC, abstractmethod
from typing import List
from .result import WorkerResult

class OrderingBuffer(ABC):
    """
    Abstract interface for a buffer that reorders worker results.
    It ensures that chapters are processed in the correct sequence,
    even if they are downloaded out of order.
    """

    @abstractmethod
    def add(self, result: WorkerResult) -> None:
        """
        Adds a result to the buffer.
        """
        pass

    @abstractmethod
    def pop_ready(self) -> List[WorkerResult]:
        """
        Returns a list of results that are now in the correct, contiguous order.
        """
        pass

    @abstractmethod
    def has_pending(self) -> bool:
        """
        Returns True if there are still results in the buffer waiting to be ordered.
        """
        pass

    @abstractmethod
    def reset(self) -> None:
        """
        Clears the buffer and resets its state.
        """
        pass
