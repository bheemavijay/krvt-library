import concurrent.futures
import os
from typing import Iterator

from .task import DownloadTask
from .result import WorkerResult
from .task_queue import TaskQueue
from .worker import Worker
from src.retriever.core.context import BrowserContext
from src.retriever.providers.base import BaseProvider

class WorkerPool:
    """
    A pool of worker threads to process download tasks concurrently,
    with built-in backpressure.
    """
    def __init__(self, provider: BaseProvider, browser_context: BrowserContext, max_workers: int = None, queue_size: int = 0):
        self.provider = provider
        self.browser_context = browser_context

        self.max_workers = max_workers or min(os.cpu_count() * 2, self.provider.capabilities.max_parallel)

        # If queue_size is 0, it's unbounded. Otherwise, it's bounded.
        self.task_queue = TaskQueue(maxsize=queue_size or self.max_workers * 2)

        self._executor = concurrent.futures.ThreadPoolExecutor(max_workers=self.max_workers)
        self._futures = []
        self._is_closed = False

    def start(self):
        pass

    def submit(self, task: DownloadTask, block=True, timeout=None):
        """
        Submits a task to the worker pool.
        If the queue is full, this call will block by default.
        """
        if self._is_closed:
            raise RuntimeError("Cannot submit tasks to a closed worker pool.")

        # This now blocks if the queue is full, providing backpressure
        self.task_queue.put(task, block=block, timeout=timeout)

        future = self._executor.submit(self._run_task, task)
        self._futures.append(future)

    def _run_task(self, task: DownloadTask) -> WorkerResult:
        worker = Worker(self.browser_context)
        return worker.execute(task)

    def results(self) -> Iterator[WorkerResult]:
        for future in concurrent.futures.as_completed(self._futures):
            yield future.result()

    def close(self):
        self._is_closed = True

    def shutdown(self, wait=True, cancel_pending=False):
        if cancel_pending:
            for future in self._futures:
                if not future.done():
                    future.cancel()

        self._executor.shutdown(wait=wait)
