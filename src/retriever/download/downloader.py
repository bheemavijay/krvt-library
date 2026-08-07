import time
from datetime import datetime
from typing import Optional
import asyncio

from src.retriever.core.context import BrowserContext
from src.retriever.core.document import Document
from src.retriever.providers.manager import ProviderManager
from src.retriever.storage.storage_writer import StorageWriter
from src.retriever.normalizers.metadata_normalizer import MetadataNormalizer
from src.retriever.normalizers.chapter_normalizer import ChapterNormalizer
from src.retriever.utils.novel_id import create_novel_id
from src.retriever.models.source import Source
from src.retriever.observers.observer import DownloadObserver
from src.retriever.observers.console_observer import ConsoleDownloadObserver
from src.retriever.assets.downloader import AssetDownloader
from src.retriever.assets.options import AssetDownloadOptions
from src.retriever.retry.executor import RetryExecutor
from src.retriever.runtime.context import RuntimeContext
from src.retriever.runtime.exceptions import CancellationException
from src.retriever.worker.worker_pool import WorkerPool
from src.retriever.worker.task import DownloadTask
from src.retriever.worker.ordering_buffer import OrderingBuffer

from .request import DownloadRequest
from .result import DownloadResult, DownloadStatus
from .batch_builder import BatchBuilder

class DownloadEngine:
    def __init__(
        self,
        browser_context: BrowserContext,
        storage: StorageWriter,
        asset_downloader: AssetDownloader,
        retry_executor: RetryExecutor,
        worker_pool: WorkerPool,
        ordering_buffer: OrderingBuffer,
        observer: Optional[DownloadObserver] = None,
        metadata_normalizer: Optional[MetadataNormalizer] = None,
        chapter_normalizer: Optional[ChapterNormalizer] = None
    ):
        self.browser_context = browser_context
        self.storage = storage
        self.asset_downloader = asset_downloader
        self.retry_executor = retry_executor
        self.worker_pool = worker_pool
        self.ordering_buffer = ordering_buffer
        self.observer = observer or ConsoleDownloadObserver()
        self.metadata_normalizer = metadata_normalizer or MetadataNormalizer()
        self.chapter_normalizer = chapter_normalizer or ChapterNormalizer()

        self.retry_executor.observer = self.observer

    async def _fetch_document(self, url: str, navigation_mode, operation_name: str, runtime: RuntimeContext) -> Document:
        return await self.retry_executor.execute(
            func=lambda: self.browser_context.get(url, navigation_mode),
            operation_name=operation_name,
            runtime=runtime
        )

    def _flush_pending_batch(self, novel_id: str, batch_builder: BatchBuilder, last_successful_order: int, downloaded_count: int, skipped_count: int, failed_count: int, total_chapters: int):
        if batch_builder.count > 0:
            self.observer.batch_written(batch_builder.count)
            self.storage.append_batch(novel_id, batch_builder.flush())
            self.storage.save_checkpoint(novel_id, last_successful_order, downloaded_count, skipped_count, failed_count, total_chapters)
            self.observer.checkpoint_saved(last_successful_order)

    async def download(self, request: DownloadRequest, runtime: RuntimeContext = None) -> DownloadResult:
        runtime = runtime or RuntimeContext()

        # ... (initial setup) ...

        try:
            # ... (provider resolution, metadata, resume logic) ...

            # 5. Submit tasks to WorkerPool
            self.worker_pool.start()
            for summary in chapters_to_download:
                task = DownloadTask(
                    chapter_summary=summary,
                    provider=provider,
                    retry_executor=self.retry_executor,
                    runtime=runtime,
                    chapter_normalizer=self.chapter_normalizer
                )
                self.worker_pool.submit(task)
            self.worker_pool.close()

            # 6. Process results from workers as they complete
            self.ordering_buffer.reset()

            for result in self.worker_pool.results():
                runtime.check()

                if result.success:
                    self.ordering_buffer.add(result)
                    for ready_result in self.ordering_buffer.pop_ready():
                        chapter = ready_result.result
                        self.observer.chapter_completed(chapter.order, chapter.title)
                        batch_builder.add(chapter)
                        downloaded_count += 1
                        last_successful_order = chapter.order

                        if batch_builder.is_full():
                            self._flush_pending_batch(novel_id, batch_builder, last_successful_order, downloaded_count, skipped_count, failed_count, total_chapters)
                else:
                    failed_count += 1
                    # ... (error handling) ...

            # 7. Final flush and finish
            self._flush_pending_batch(novel_id, batch_builder, last_successful_order, downloaded_count, skipped_count, failed_count, total_chapters)

            # ... (final status and return) ...

        except CancellationException:
            self.worker_pool.shutdown(cancel_pending=True)
            # ... (cancellation handling) ...
        except Exception as e:
            self.worker_pool.shutdown(cancel_pending=True)
            # ... (exception handling) ...
        finally:
            self.worker_pool.shutdown()

        # Simplified return
        return DownloadResult(novel_id=novel_id, status=final_status, provider=provider_id, downloaded=downloaded_count, total=total_chapters, skipped=skipped_count, failed=failed_count, asset_downloaded=asset_downloaded_count, asset_failed=asset_failed_count, duration_ms=0, errors=errors)
