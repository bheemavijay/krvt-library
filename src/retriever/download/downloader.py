import time
from datetime import datetime

from src.retriever.core.context import BrowserContext
from src.retriever.providers.manager import ProviderManager
from src.retriever.storage.storage_writer import StorageWriter
from src.retriever.normalizers.metadata_normalizer import MetadataNormalizer
from src.retriever.normalizers.chapter_normalizer import ChapterNormalizer
from src.retriever.utils.novel_id import create_novel_id
from src.retriever.models.source import Source

from .request import DownloadRequest
from .result import DownloadResult, DownloadStatus
from .batch_builder import BatchBuilder

class DownloadEngine:
    def __init__(
        self,
        browser_context: BrowserContext,
        storage: StorageWriter,
        metadata_normalizer: MetadataNormalizer = None,
        chapter_normalizer: ChapterNormalizer = None
    ):
        self.browser_context = browser_context
        self.storage = storage
        self.metadata_normalizer = metadata_normalizer or MetadataNormalizer()
        self.chapter_normalizer = chapter_normalizer or ChapterNormalizer()

    def _emit(self, message: str):
        # TODO: Phase 4 - Replace with a proper ProgressReporter/EventEmitter
        print(message)

    def download(self, request: DownloadRequest) -> DownloadResult:
        start_time = time.time()
        errors = []
        downloaded_count = 0
        skipped_count = 0
        failed_count = 0
        last_successful_order = 0
        novel_id = "unknown"
        provider_id = "unknown"
        total_chapters = 0
        storage_started = False
        final_status = DownloadStatus.FAILED # Default to failed

        try:
            # 1. Resolve Provider
            provider = ProviderManager.resolve(request.url)
            provider_id = provider.id

            # 2. Fetch and Parse Metadata
            self._emit("[Phase 1] Fetching metadata...")
            document = self.browser_context.get(request.url, provider.navigation_mode)
            raw_metadata = provider.parse_metadata(document, request.url)
            metadata = self.metadata_normalizer.normalize(raw_metadata)

            # 3. Generate ID
            novel_id = create_novel_id(provider.id, metadata.title)

            # 3.1 Resume Logic
            start_from_order = 0
            if request.resume and self.storage.exists(novel_id):
                manifest = self.storage.load_manifest(novel_id)
                if manifest and manifest.get("status") == "COMPLETED" and not request.overwrite:
                    self._emit(f"Novel '{novel_id}' is already marked as COMPLETED. Skipping.")
                    return DownloadResult(novel_id=novel_id, status=DownloadStatus.SKIPPED, provider=provider_id, downloaded=0, total=manifest.get("total", 0), skipped=manifest.get("total", 0), failed=0, duration_ms=0, errors=[])

                checkpoint = self.storage.load_checkpoint(novel_id)
                if checkpoint and 'last_successful_order' in checkpoint:
                    start_from_order = checkpoint['last_successful_order']
                    skipped_count = start_from_order
                    self._emit(f"Resuming download from chapter {start_from_order + 1}")

            # Begin storage if not resuming or if overwriting
            if start_from_order == 0 or request.overwrite:
                if self.storage.exists(novel_id) and request.overwrite:
                    self._emit(f"Overwriting existing novel: {novel_id}")
                    self.storage.delete(novel_id)

                source = Source(provider_id=provider.id, provider_name=provider.name, source_url=request.url, language=provider.language, version=provider.version)
                self.storage.begin(novel_id, request, metadata, source)
                storage_started = True

            self._emit(f"Novel ID: {novel_id}")

            # 4. Get Chapter List
            chapter_summaries = provider.parse_chapter_list(document, request.url)
            chapters_to_download = [s for s in chapter_summaries if s.order > start_from_order]
            total_chapters = len(chapter_summaries)

            self._emit(f"Found {total_chapters} total chapters. Downloading {len(chapters_to_download)} new chapters.")

            # 5. Download Chapters in Batches
            self._emit("\n[Phase 2] Downloading chapter content...")
            batch_builder = BatchBuilder(request.batch_size)

            for summary in chapters_to_download:
                self._emit(f"[{summary.order}/{total_chapters}] Downloading: {summary.title}")
                try:
                    chapter_doc = self.browser_context.get(summary.url, provider.navigation_mode)
                    raw_chapter = provider.parse_chapter(chapter_doc, summary.url)
                    chapter = self.chapter_normalizer.normalize(raw_chapter, summary.order)
                    batch_builder.add(chapter)
                    downloaded_count += 1
                    last_successful_order = summary.order

                    if batch_builder.is_full():
                        self._emit(f"  -> Writing batch of {batch_builder.count} chapters...")
                        self.storage.append_batch(novel_id, batch_builder.flush())
                        self.storage.save_checkpoint(novel_id, last_successful_order, downloaded_count, skipped_count, failed_count, total_chapters)

                except Exception as e:
                    failed_count += 1
                    error_msg = f"Failed to download chapter {summary.order} ({summary.title}): {e}"
                    self._emit(f"  - {error_msg}")
                    errors.append(error_msg)
                    continue

            # 6. Flush remaining chapters
            if batch_builder.count > 0:
                self._emit(f"  -> Writing final batch of {batch_builder.count} chapters...")
                self.storage.append_batch(novel_id, batch_builder.flush())

            # 7. Finalize
            if not errors and (downloaded_count + skipped_count) >= total_chapters:
                final_status = DownloadStatus.COMPLETED
            else:
                final_status = DownloadStatus.PARTIAL

            self.storage.finish(novel_id, final_status)
            end_time = time.time()

            self._emit("\n--- Download Complete ---")
            return DownloadResult(
                novel_id=novel_id, status=final_status, provider=provider_id, downloaded=downloaded_count,
                total=total_chapters, skipped=skipped_count, failed=failed_count,
                duration_ms=int((end_time - start_time) * 1000), errors=errors
            )

        except Exception as e:
            end_time = time.time()
            self._emit(f"\n--- Download Failed ---")
            self._emit(f"An unrecoverable error occurred: {e}")
            errors.append(str(e))
            if storage_started:
                self.storage.abort(novel_id)

            return DownloadResult(
                novel_id=novel_id, status=DownloadStatus.FAILED, provider=provider_id, downloaded=downloaded_count,
                total=total_chapters, skipped=skipped_count, failed=failed_count,
                duration_ms=int((end_time - start_time) * 1000), errors=errors
            )
