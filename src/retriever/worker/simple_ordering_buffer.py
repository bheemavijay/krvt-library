from typing import List
from .result import WorkerResult
from .ordering_buffer import OrderingBuffer

class SimpleOrderingBuffer(OrderingBuffer):
    """
    A simple, non-ordering implementation of the OrderingBuffer.
    It passes results through immediately without reordering.
    This is a placeholder for the real implementation in Phase 4F-C.
    """
    def __init__(self):
        self._buffer: List[WorkerResult] = []

    def add(self, result: WorkerResult) -> None:
        """
        Adds a result to the buffer.
        """
        self._buffer.append(result)

    def pop_ready(self) -> List[WorkerResult]:
        """
        Returns all results currently in the buffer and clears it.
        """
        ready_results = list(self._buffer)
        self.reset()
        return ready_results

    def has_pending(self) -> bool:
        """
        Returns True if there are any results in the buffer.
        """
        return len(self._buffer) > 0

    def reset(self) -> None:
        """
        Clears the buffer.
        """
        self._buffer.clear()
