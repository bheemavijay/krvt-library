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
from src.retriever.observers.observer import DownloadObserver
from src.retriever.observers.console_observer import ConsoleDownloadObserver
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
        observer: Optional[DownloadObserver] = None,
        metadata_normalizer: Optional[MetadataNormalizer] = None,
        chapter_normalizer: Optional[ChapterNormalizer] = None
    ):
        self.browser_context = browser_context
        self.storage = storage
        self.asset_downloader = asset_downloader
        self.observer = observer or ConsoleDownloadObserver()
        self.metadata_normalizer = metadata_normalizer or MetadataNormalizer()
        self.chapter_normalizer = chapter_normalizer or ChapterNormalizer()

    async def download(self, request: DownloadRequest) -> DownloadResult:
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

        try:
            self.observer.download_started(request.url)

            provider = ProviderManager.resolve(request.url)
            provider_id = provider.id

            document = self.browser_context.get(request.url, provider.navigation_mode)
            raw_metadata = provider.parse_metadata(document, request.url)
            metadata = self.metadata_normalizer.normalize(raw_metadata)
            self.observer.metadata_loaded(metadata.title, provider.id)

            novel_id = create_novel_id(provider.id, metadata.title)

            start_from_order = 0
            if request.resume and self.storage.exists(novel_id):
                manifest = self.storage.load_manifest(novel_id)
                if manifest and manifest.get("status") == "COMPLETED" and not request.overwrite:
                    final_status = DownloadStatus.SKIPPED
                    total_chapters = manifest.get("total", 0)
                    result = DownloadResult(novel_id=novel_id, status=final_status, provider=provider_id, downloaded=0, total=total_chapters, skipped=total_chapters, failed=0, duration_ms=0, errors=[])
                    self.observer.download_finished(final_status, 0, total_chapters, 0, 0, [])
                    return result

                checkpoint = self.storage.load_checkpoint(novel_id)
                if checkpoint and 'last_successful_order' in checkpoint:
                    start_from_order = checkpoint['last_successful_order']
                    skipped_count = start_from_order

            if start_from_order == 0 or request.overwrite:
                if self.storage.exists(novel_id) and request.overwrite:
                    self.storage.delete(novel_id)

                source = Source(provider_id=provider.id, provider_name=provider.name, source_url=request.url, language=provider.language, version=provider.version)
                self.storage.begin(novel_id, request, metadata, source)
                storage_started = True

            # Asset Download
            asset_options = AssetDownloadOptions(
                enabled=request.download_assets,
                download_cover=request.download_cover,
                download_banner=request.download_banner
            )
            assets_to_download = provider.get_assets(metadata)
            asset_result = await self.asset_downloader.download(novel_id, assets_to_download, asset_options)
            asset_downloaded_count = asset_result.downloaded
            asset_failed_count = asset_result.failed
            if asset_failed_count > 0:
                errors.append(f"{asset_failed_count} assets failed to download.")

            chapter_summaries = provider.parse_chapter_list(document, request.url)
            chapters_to_download = [s for s in chapter_summaries if s.order > start_from_order]
            total_chapters = len(chapter_summaries)

            if skipped_count > 0:
                self.observer.resumed(skipped_count, len(chapters_to_download))
            self.observer.chapters_found(total_chapters, len(chapters_to_download))

            batch_builder = BatchBuilder(request.batch_size)

            for summary in chapters_to_download:
                self.observer.chapter_started(summary.order, total_chapters, summary.title)
                try:
                    chapter_doc = self.browser_context.get(summary.url, provider.navigation_mode)
                    raw_chapter = provider.parse_chapter(chapter_doc, summary.url)
                    chapter = self.chapter_normalizer.normalize(raw_chapter, summary.order)
                    batch_builder.add(chapter)
                    downloaded_count += 1
                    last_successful_order = summary.order
                    self.observer.chapter_completed(summary.order, summary.title)

                    if batch_builder.is_full():
                        batch_size = batch_builder.count
                        self.storage.append_batch(novel_id, batch_builder.flush())
                        self.observer.batch_written(batch_size)
                        self.storage.save_checkpoint(novel_id, last_successful_order, downloaded_count, skipped_count, failed_count, total_chapters)
                        self.observer.checkpoint_saved(last_successful_order)

                except Exception as e:
                    failed_count += 1
                    error_msg = f"Chapter {summary.order}: {e}"
                    errors.append(error_msg)
                    self.observer.chapter_failed(summary.order, summary.title, error_msg)
                    continue

            if batch_builder.count > 0:
                batch_size = batch_builder.count
                self.storage.append_batch(novel_id, batch_builder.flush())
                self.observer.batch_written(batch_size)

            if not errors and (downloaded_count + skipped_count) >= total_chapters:
                final_status = DownloadStatus.COMPLETED
            else:
                final_status = DownloadStatus.PARTIAL

            self.storage.finish(novel_id, final_status)
            end_time = time.time()

            duration_ms = int((end_time - start_time) * 1000)
            self.observer.download_finished(final_status, downloaded_count, skipped_count, failed_count, duration_ms, errors)
            return DownloadResult(
                novel_id=novel_id, status=final_status, provider=provider_id, downloaded=downloaded_count,
                total=total_chapters, skipped=skipped_count, failed=failed_count,
                asset_downloaded=asset_downloaded_count, asset_failed=asset_failed_count,
                duration_ms=duration_ms, errors=errors
            )

        except Exception as e:
            end_time = time.time()
            errors.append(str(e))
            if storage_started:
                self.storage.abort(novel_id)

            duration_ms = int((end_time - start_time) * 1000)
            final_status = DownloadStatus.FAILED
            self.observer.download_finished(final_status, downloaded_count, skipped_count, failed_count, duration_ms, errors)
            return DownloadResult(
                novel_id=novel_id, status=final_status, provider=provider_id, downloaded=downloaded_count,
                total=total_chapters, skipped=skipped_count, failed=failed_count,
                asset_downloaded=asset_downloaded_count, asset_failed=asset_failed_count,
                duration_ms=duration_ms, errors=errors
            )
