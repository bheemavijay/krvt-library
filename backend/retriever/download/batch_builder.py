from typing import List
from ..models.chapter import Chapter

class BatchBuilder:
    """
    Accumulates chapters into batches for processing.
    """

    def __init__(self, batch_size: int = 25):
        if batch_size <= 0:
            raise ValueError("Batch size must be a positive integer.")
        self.batch_size = batch_size
        self._batch: List[Chapter] = []

    def add(self, chapter: Chapter) -> None:
        """
        Adds a chapter to the current batch.
        """
        self._batch.append(chapter)

    def is_full(self) -> bool:
        """
        Checks if the batch has reached its capacity.
        """
        return len(self._batch) >= self.batch_size

    def flush(self) -> List[Chapter]:
        """
        Returns the current batch and clears it.
        """
        batch_to_return = list(self._batch)
        self.clear()
        return batch_to_return

    def remaining(self) -> List[Chapter]:
        """
        Returns any remaining chapters in the batch without clearing it.
        Useful for the final batch after the main loop.
        """
        return list(self._batch)

    def clear(self) -> None:
        """
        Clears the current batch.
        """
        self._batch.clear()

    @property
    def count(self) -> int:
        """
        Returns the number of chapters currently in the batch.
        """
        return len(self._batch)
