import time
from .task import DownloadTask
from .result import WorkerResult
from src.retriever.core.context import BrowserContext # Assuming worker needs this

class Worker:
    """
    A stateless worker that processes a single DownloadTask.
    """
    def __init__(self, browser_context: BrowserContext):
        self.browser_context = browser_context

    def execute(self, task: DownloadTask) -> WorkerResult:
        """
        Executes the task and returns a WorkerResult.
        """
        start_time = time.time()
        attempts = 0

        try:
            # This is where the core logic of a worker goes.
            # It uses the components passed in the task to download and process a chapter.

            # 1. Fetch chapter document using retry_executor from the task
            chapter_doc = task.retry_executor.execute(
                func=lambda: self.browser_context.get(task.chapter_summary.url, task.provider.navigation_mode),
                operation_name=f"Fetch chapter {task.chapter_summary.order}",
                runtime=task.runtime
            )

            # 2. Parse the raw chapter
            raw_chapter = task.provider.parse_chapter(chapter_doc, task.chapter_summary.url)

            # 3. Normalize the chapter
            normalized_chapter = task.chapter_normalizer.normalize(raw_chapter, task.chapter_summary.order)

            duration_ms = int((time.time() - start_time) * 1000)
            # In a real implementation, attempts would be tracked by the retry_executor
            # and passed back. For now, it's a placeholder.
            attempts = 1

            return WorkerResult(
                task=task,
                success=True,
                result=normalized_chapter,
                attempts=attempts,
                duration_ms=duration_ms
            )
        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            return WorkerResult(
                task=task,
                success=False,
                exception=e,
                attempts=attempts,
                duration_ms=duration_ms
            )
