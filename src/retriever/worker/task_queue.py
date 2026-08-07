from queue import Queue, Empty
from typing import Optional
from .task import DownloadTask

class TaskQueue:
    """
    A simple wrapper around a queue to manage download tasks.
    """
    def __init__(self):
        self._queue = Queue()

    def put(self, task: Optional[DownloadTask]):
        self._queue.put(task)

    def get(self, block=True, timeout=None) -> Optional[DownloadTask]:
        try:
            return self._queue.get(block=block, timeout=timeout)
        except Empty:
            return None

    def task_done(self):
        self._queue.task_done()

    def join(self):
        self._queue.join()
