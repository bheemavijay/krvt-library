import concurrent.futures
from typing import Iterator
from threading import Thread

from .task import DownloadTask
from .result import WorkerResult
from .task_queue import TaskQueue
from .worker import Worker
from src.retriever.core.context import BrowserContext # For worker instantiation

class WorkerPool:
    """
    A pool of worker threads to process download tasks concurrently.
    """
    def __init__(self, max_workers: int, browser_context: BrowserContext):
        self.max_workers = max_workers
        self.browser_context = browser_context
        self.task_queue = TaskQueue()
        self.result_queue = TaskQueue()
        self._workers = []
        self._executor = concurrent.futures.ThreadPoolExecutor(max_workers=self.max_workers)
        self._is_closed = False

    def start(self):
        """
        Starts the worker threads.
        """
        for _ in range(self.max_workers):
            worker_thread = self._executor.submit(self._worker_loop)
            self._workers.append(worker_thread)

    def submit(self, task: DownloadTask):
        """
        Submits a task to the worker pool.
        """
        if self._is_closed:
            raise RuntimeError("Cannot submit tasks to a closed worker pool.")
        self.task_queue.put(task)

    def _worker_loop(self):
        """
        The main loop for a single worker thread.
        """
        # Each worker thread gets its own BrowserContext instance if needed,
        # or shares one depending on the design. For now, we assume it's passed in.
        worker = Worker(self.browser_context)

        while not (self._is_closed and self.task_queue._queue.empty()):
            task = self.task_queue.get()
            if task is None:
                break

            result = worker.execute(task)
            self.result_queue.put(result)
            self.task_queue.task_done()

    def next_result(self, block=True, timeout=None) -> WorkerResult:
        """
        Retrieves the next result from the result queue.
        """
        return self.result_queue.get(block=block, timeout=timeout)

    def close(self):
        """

        Signals that no more tasks will be submitted.
        Workers will finish their current tasks and then exit.
        """
        self._is_closed = True

    def shutdown(self, wait=True):
        """
        Shuts down the worker pool, waiting for all tasks to complete.
        """
        self.close()
        for _ in range(self.max_workers):
            self.task_queue.put(None) # Sentinel value to stop workers

        if wait:
            self.task_queue.join()

        self._executor.shutdown(wait=wait)
