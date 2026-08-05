from typing import List
from .download_options import DownloadOptions
from .batch_builder import BatchBuilder
from .models.novel_metadata import NovelMetadata
from .models.chapter import Chapter
from .normalizers.metadata_normalizer import MetadataNormalizer
# Assuming a ChapterNormalizer exists or will be created
# from .normalizers.chapter_normalizer import ChapterNormalizer
from backend.storage.storage_writer import StorageWriter
from backend.providers.provider_manager import ProviderManager # Assuming this path

class Downloader:
    """
    Orchestrates the download of a novel, delegating parsing to providers
    and storage to a StorageWriter.
    """

    def __init__(
        self,
        options: DownloadOptions,
        storage: StorageWriter,
        provider_manager: ProviderManager,
        # browser_context: BrowserContext # Assuming a browser context object
    ):
        self.options = options
        self.storage = storage
        self.provider_manager = provider_manager
        # self.browser_context = browser_context
        self.metadata_normalizer = MetadataNormalizer()
        # self.chapter_normalizer = ChapterNormalizer()

    def download(self, url: str):
        """
        Main entry point to download a novel.
        """
        # 1. Resolve provider from URL
        provider = self.provider_manager.resolve(url)
        if not provider:
            raise ValueError(f"No provider found for URL: {url}")

        # 2. Get raw metadata
        # html = self.browser_context.get(url) # This would be the flow
        # raw_metadata = provider.parse_metadata(html)
        # metadata = self.metadata_normalizer.normalize(raw_metadata)

        # Placeholder for metadata, since I can't execute the above
        metadata = NovelMetadata(id="", provider="placeholder", slug="placeholder", title="Placeholder", sourceUrl=url)
        novel_id = "placeholder_id" # This would be resolved externally

        # 3. Begin storage
        self.storage.begin(novel_id, metadata, source=None) # Source would come from provider

        # 4. Get chapter list
        # chapter_urls = provider.parse_chapter_list(html)
        chapter_urls = [] # Placeholder

        # 5. Process chapters in batches
        builder = BatchBuilder(self.options.batch_size)
        total_chapters = len(chapter_urls)

        for i, chapter_url in enumerate(chapter_urls):
            # raw_chapter_html = self.browser_context.get(chapter_url)
            # raw_chapter = provider.parse_chapter(raw_chapter_html)
            # chapter = self.chapter_normalizer.normalize(raw_chapter)

            # Placeholder for chapter
            chapter = Chapter(order=i+1, title=f"Chapter {i+1}", content=[], source_url=chapter_url)

            builder.add(chapter)

            if builder.is_full():
                batch = builder.flush()
                self.storage.append_batch(novel_id, batch)
                self.storage.save_checkpoint(novel_id, completed=i + 1, total=total_chapters)

        # 6. Handle final batch
        remaining = builder.remaining()
        if remaining:
            self.storage.append_batch(novel_id, remaining)
            self.storage.save_checkpoint(novel_id, completed=total_chapters, total=total_chapters)

        # 7. Finalize
        self.storage.finish(novel_id)
