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
        failed_count = 0
        last_successful_order = 0
        novel_id = "unknown"
        provider_id = "unknown"
        total_chapters = 0
        storage_started = False

        try:
            # 1. Resolve Provider
            provider = ProviderManager.resolve(request.url)
            provider_id = provider.id

            # 2. Fetch and Parse Metadata
            self._emit("[Phase 1] Fetching metadata...")
            document = self.browser_context.get(request.url, provider.navigation_mode)
            raw_metadata = provider.parse_metadata(document, request.url)
            metadata = self.metadata_normalizer.normalize(raw_metadata)

            # 3. Generate ID and Begin Storage
            novel_id = create_novel_id(provider.id, metadata.title)

            # TODO: Phase 3D.1 - Add resume logic from checkpoint

            source = Source(
                provider_id=provider.id,
                provider_name=provider.name,
                source_url=request.url,
                language=provider.language,
                version=provider.version
            )
            self.storage.begin(novel_id, request, metadata, source)
            storage_started = True
            self._emit(f"Novel ID: {novel_id}")

            # 4. Get Chapter List
            chapter_summaries = provider.parse_chapter_list(document, request.url)
            if request.chapter_limit:
                chapter_summaries = chapter_summaries[:request.chapter_limit]

            total_chapters = len(chapter_summaries)
            self._emit(f"Found {total_chapters} chapters to download for '{metadata.title}'.")

            # 5. Download Chapters in Batches
            self._emit("\n[Phase 2] Downloading chapter content...")
            batch_builder = BatchBuilder(request.batch_size)

            for summary in chapter_summaries:
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
                        self.storage.save_checkpoint(novel_id, last_successful_order, total_chapters)

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
            self.storage.finish(novel_id)
            end_time = time.time()

            self._emit("\n--- Download Complete ---")
            return DownloadResult(
                novel_id=novel_id,
                status=DownloadStatus.COMPLETED if not errors else DownloadStatus.PARTIAL,
                provider=provider_id,
                downloaded=downloaded_count,
                total=total_chapters,
                skipped=0, # TODO: Phase 3D.1
                failed=failed_count,
                duration_ms=int((end_time - start_time) * 1000),
                errors=errors
            )

        except Exception as e:
            end_time = time.time()
            self._emit(f"\n--- Download Failed ---")
            self._emit(f"An unrecoverable error occurred: {e}")
            errors.append(str(e))
            if storage_started:
                self.storage.abort(novel_id)

            return DownloadResult(
                novel_id=novel_id,
                status=DownloadStatus.FAILED,
                provider=provider_id,
                downloaded=downloaded_count,
                total=total_chapters,
                skipped=0,
                failed=failed_count, # Use the explicit counter
                duration_ms=int((end_time - start_time) * 1000),
                errors=errors
            )
