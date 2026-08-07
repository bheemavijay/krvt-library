from typing import List
from .result import WorkerResult
from .ordering_buffer import OrderingBuffer

class SimpleOrderingBuffer(OrderingBuffer):
    """
    A simple, non-ordering implementation of the OrderingBuffer.
    """
    def __init__(self, max_size: int = 100):
        self.max_size = max_size
        self._buffer: List[WorkerResult] = []

    def add(self, result: WorkerResult) -> None:
        self._buffer.append(result)

    def pop_ready(self) -> List[WorkerResult]:
        ready_results = list(self._buffer)
        self.reset()
        return ready_results

    def has_pending(self) -> bool:
        return len(self._buffer) > 0

    def is_full(self) -> bool:
        return len(self._buffer) >= self.max_size

    def reset(self) -> None:
        self._buffer.clear()
