from typing import List, Dict
from .result import WorkerResult
from .ordering_buffer import OrderingBuffer

class OrderedBuffer(OrderingBuffer):
    """
    An implementation of the OrderingBuffer that reorders worker results
    to ensure they are processed in the correct sequence.
    """
    def __init__(self, start_order: int = 1):
        self._buffer: Dict[int, WorkerResult] = {}
        self._next_order = start_order

    def add(self, result: WorkerResult) -> None:
        """
        Adds a result to the buffer.
        Assumes the task_id of the result is the chapter order.
        """
        # We need a way to get the order from the result.
        # Assuming result.task.chapter_summary.order for now.
        order = result.task.chapter_summary.order
        self._buffer[order] = result

    def pop_ready(self) -> List[WorkerResult]:
        """
        Returns a list of results that are now in the correct, contiguous order.
        """
        ready_results = []
        while self._next_order in self._buffer:
            result = self._buffer.pop(self._next_order)
            ready_results.append(result)
            self._next_order += 1
        return ready_results

    def has_pending(self) -> bool:
        """
        Returns True if there are still results in the buffer waiting to be ordered.
        """
        return len(self._buffer) > 0

    def reset(self, start_order: int = 1) -> None:
        """
        Clears the buffer and resets its state.
        """
        self._buffer.clear()
        self._next_order = start_order
