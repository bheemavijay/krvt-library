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
        observer: Optional[DownloadObserver] = None,
        metadata_normalizer: Optional[MetadataNormalizer] = None,
        chapter_normalizer: Optional[ChapterNormalizer] = None
    ):
        self.browser_context = browser_context
        self.storage = storage
        self.asset_downloader = asset_downloader
        self.retry_executor = retry_executor
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

        start_time = time.time()
        errors = []
        downloaded_count = 0
        skipped_count = 0
        failed_count = 0
        asset_downloaded_count = 0
        asset_failed_count = 0
        last_successful_order = 0
        novel_id = "unknown"
        provider_id = "unknown"
        total_chapters = 0
        storage_started = False
        final_status = DownloadStatus.FAILED
        batch_builder = BatchBuilder(request.batch_size)

        try:
            runtime.check()
            self.observer.download_started(request.url)

            provider = ProviderManager.resolve(request.url)
            provider_id = provider.id

            document = await self._fetch_document(request.url, provider.navigation_mode, "Fetch metadata", runtime)
            raw_metadata = provider.parse_metadata(document, request.url)
            metadata = self.metadata_normalizer.normalize(raw_metadata)
            self.observer.metadata_loaded(metadata.title, provider.id)

            novel_id = create_novel_id(provider.id, metadata.title)

            start_from_order = 0
            if request.resume and self.storage.exists(novel_id):
                # ... resume logic ...
                pass

            if start_from_order == 0 or request.overwrite:
                # ... begin storage logic ...
                pass

            source = Source(provider_id=provider.id, provider_name=provider.name, source_url=request.url, language=provider.language, version=provider.version)
            self.storage.begin(novel_id, request, metadata, source)
            storage_started = True

            # Asset Download
            asset_options = AssetDownloadOptions(enabled=request.download_assets, download_cover=request.download_cover, download_banner=request.download_banner)
            assets_to_download = provider.get_assets(metadata)
            asset_result = await self.asset_downloader.download(novel_id, assets_to_download, asset_options, runtime)
            asset_downloaded_count = asset_result.downloaded
            asset_failed_count = asset_result.failed
            if asset_failed_count > 0:
                errors.append(f"{asset_failed_count} assets failed to download.")

            chapter_summaries = provider.parse_chapter_list(document, request.url)
            chapters_to_download = [s for s in chapter_summaries if s.order > start_from_order]
            total_chapters = len(chapter_summaries)

            self.observer.chapters_found(total_chapters, len(chapters_to_download))

            for summary in chapters_to_download:
                runtime.check()
                self.observer.chapter_started(summary.order, total_chapters, summary.title)
                try:
                    chapter_doc = await self._fetch_document(summary.url, provider.navigation_mode, f"Fetch chapter {summary.order}", runtime)
                    raw_chapter = provider.parse_chapter(chapter_doc, summary.url)
                    chapter = self.chapter_normalizer.normalize(raw_chapter, summary.order)
                    batch_builder.add(chapter)
                    downloaded_count += 1
                    last_successful_order = summary.order
                    self.observer.chapter_completed(summary.order, summary.title)

                    if batch_builder.is_full():
                        self._flush_pending_batch(novel_id, batch_builder, last_successful_order, downloaded_count, skipped_count, failed_count, total_chapters)

                except Exception as e:
                    if isinstance(e, CancellationException):
                        raise
                    failed_count += 1
                    # ... error handling ...
                    continue

            self._flush_pending_batch(novel_id, batch_builder, last_successful_order, downloaded_count, skipped_count, failed_count, total_chapters)

            final_status = DownloadStatus.COMPLETED if not errors else DownloadStatus.PARTIAL
            self.storage.finish(novel_id, final_status)

            # ... return DownloadResult ...

        except CancellationException:
            self.observer.download_cancelled()
            if storage_started:
                self._flush_pending_batch(novel_id, batch_builder, last_successful_order, downloaded_count, skipped_count, failed_count, total_chapters)
                self.storage.abort(novel_id)

            final_status = DownloadStatus.CANCELLED
            # ... return DownloadResult for cancellation ...
        except Exception as e:
            if storage_started:
                self.storage.abort(novel_id)
            # ... return DownloadResult for failure ...

        # Simplified return for brevity
        return DownloadResult(novel_id=novel_id, status=final_status, provider=provider_id, downloaded=downloaded_count, total=total_chapters, skipped=skipped_count, failed=failed_count, asset_downloaded=asset_downloaded_count, asset_failed=asset_failed_count, duration_ms=0, errors=errors)
