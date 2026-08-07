import time
from datetime import datetime
from typing import Optional
import asyncio

from src.retriever.core.context import BrowserContext
from src.retriever.providers.manager import ProviderManager
from src.retriever.storage.storage_writer import StorageWriter
from src.retriever.normalizers.metadata_normalizer import MetadataNormalizer
from src.retriever.normalizers.chapter_normalizer import ChapterNormalizer
from src.retriever.utils.novel_id import create_novel_id
from src.retriever.models.source import Source
from src.retriever.runtime.services import RuntimeServices
from src.retriever.runtime.context import RuntimeContext
from src.retriever.runtime.exceptions import CancellationException
from src.retriever.worker.worker_pool import WorkerPool
from src.retriever.worker.task import DownloadTask
from src.retriever.worker.ordering_buffer import OrderingBuffer
from src.retriever.assets.downloader import AssetDownloader
from src.retriever.assets.options import AssetDownloadOptions

from .request import DownloadRequest
from .result import DownloadResult, DownloadStatus
from .batch_builder import BatchBuilder

class DownloadEngine:
    def __init__(
        self,
        browser_context: BrowserContext,
        storage: StorageWriter,
        asset_downloader: AssetDownloader,
        worker_pool: WorkerPool,
        ordering_buffer: OrderingBuffer,
        runtime_services: RuntimeServices,
        metadata_normalizer: Optional[MetadataNormalizer] = None,
        chapter_normalizer: Optional[ChapterNormalizer] = None
    ):
        self.browser_context = browser_context
        self.storage = storage
        self.asset_downloader = asset_downloader
        self.worker_pool = worker_pool
        self.ordering_buffer = ordering_buffer
        self.services = runtime_services
        self.metadata_normalizer = metadata_normalizer or MetadataNormalizer()
        self.chapter_normalizer = chapter_normalizer or ChapterNormalizer()

        # Pass observer to retry executor
        self.services.retry_executor.observer = self.services.observer

    # ... (other methods) ...

    async def download(self, request: DownloadRequest, runtime: RuntimeContext = None) -> DownloadResult:
        runtime = runtime or RuntimeContext()

        # ... (initial setup) ...

        try:
            # ... (provider resolution, metadata, resume logic) ...

            # Get provider capabilities
            caps = provider.capabilities

            # 5. Submit tasks to WorkerPool with rate limiting and backpressure
            self.worker_pool.start()

            for summary in chapters_to_download:
                runtime.check()

                # Rate limit before submitting the task
                self.services.rate_limiter.acquire(
                    scope=provider.id,
                    requests_per_second=caps.requests_per_second,
                    burst=caps.burst
                )

                task = DownloadTask(...)
                self.worker_pool.submit(task)

            self.worker_pool.close()

            # 6. Process results
            for result in self.worker_pool.results():
                # ... (process results) ...
                if result.success:
                    self.services.metrics.chapter_complete(result.duration_ms / 1000)
                else:
                    self.services.metrics.chapter_fail()

            # ... (final flush and finish) ...

        # ... (exception handling) ...

        # Simplified return
        return DownloadResult(...)
