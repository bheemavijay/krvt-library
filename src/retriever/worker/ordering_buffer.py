from abc import ABC, abstractmethod
from typing import List, Optional
from .result import WorkerResult

class OrderingBuffer(ABC):
    """
    Abstract interface for a buffer that reorders worker results.
    """

    @abstractmethod
    def add(self, result: WorkerResult) -> None:
        pass

    @abstractmethod
    def pop_ready(self) -> List[WorkerResult]:
        pass

    @abstractmethod
    def has_pending(self) -> bool:
        pass

    @abstractmethod
    def is_full(self) -> bool:
        pass

    @abstractmethod
    def reset(self) -> None:
        pass
