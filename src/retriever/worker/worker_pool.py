import concurrent.futures
from typing import Iterator

from .task import DownloadTask
from .result import WorkerResult
from .task_queue import TaskQueue
from .worker import Worker
from src.retriever.core.context import BrowserContext
from src.retriever.runtime.context import RuntimeContext

class WorkerPool:
    """
    A pool of worker threads to process download tasks concurrently.
    """
    def __init__(self, max_workers: int, browser_context: BrowserContext):
        self.max_workers = max_workers
        self.browser_context = browser_context
        self.task_queue = TaskQueue()
        self.result_queue = TaskQueue()
        self._executor = concurrent.futures.ThreadPoolExecutor(max_workers=self.max_workers)
        self._futures = []
        self._is_closed = False

    def start(self):
        pass # Executor starts threads automatically

    def submit(self, task: DownloadTask):
        if self._is_closed:
            raise RuntimeError("Cannot submit tasks to a closed worker pool.")
        future = self._executor.submit(self._run_task, task)
        self._futures.append(future)

    def _run_task(self, task: DownloadTask) -> WorkerResult:
        # This method is what the thread pool executes.
        # It creates a worker and executes the task.
        worker = Worker(self.browser_context)
        return worker.execute(task)

    def results(self) -> Iterator[WorkerResult]:
        """
        Yields results as they are completed.
        """
        for future in concurrent.futures.as_completed(self._futures):
            yield future.result()

    def close(self):
        """
        Signals that no more tasks will be submitted.
        """
        self._is_closed = True

    def shutdown(self, wait=True, cancel_pending=False):
        """
        Shuts down the worker pool.
        """
        if cancel_pending:
            for future in self._futures:
                if not future.done():
                    future.cancel()

        self._executor.shutdown(wait=wait)
