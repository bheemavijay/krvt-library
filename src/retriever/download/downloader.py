import time
from bs4 import BeautifulSoup
from src.retriever.core.context import BrowserContext
from src.retriever.providers.base import BaseProvider
from src.retriever.models.provider import Novel
from src.retriever.builder.novel_builder import NovelBuilder
from src.retriever.storage.storage_writer import StorageWriter
from src.retriever.exceptions.exceptions import NavigationException
from src.retriever.normalizers.metadata_normalizer import MetadataNormalizer
from src.retriever.normalizers.chapter_normalizer import ChapterNormalizer

class Downloader:
    def __init__(self, browser_context: BrowserContext, storage: StorageWriter, retry_count: int = 3, batch_size: int = 100):
        self.browser_context = browser_context
        self.storage = storage
        self.retry_count = retry_count
        self.batch_size = batch_size
        self.normalizer = MetadataNormalizer()
        self.chapter_normalizer = ChapterNormalizer()

    def download(self, provider: BaseProvider, novel_url: str, chapter_limit: int = None) -> Novel:
        print(f"--- Starting Download: {provider.name} ---")

        print("\n[Phase 1] Fetching metadata and chapter list...")
        novel_page_html = self._get_page_with_retries(provider, novel_url)
        soup = BeautifulSoup(novel_page_html, 'html.parser')

        raw_metadata = provider.parse_metadata(soup, novel_url)
        metadata = self.normalizer.normalize(raw_metadata)

        chapter_summaries = provider.parse_chapter_list(soup, novel_url)

        if chapter_limit:
            chapter_summaries = chapter_summaries[:chapter_limit]

        print(f"Found {len(chapter_summaries)} chapters to download for '{metadata.title}'.")

        builder = NovelBuilder().set_metadata(metadata)
        self.storage.begin(provider.id + "_" + metadata.slug)

        print("\n[Phase 2] Downloading all chapter content...")
        total_chapters = len(chapter_summaries)
        start_time = time.time()

        for i, summary in enumerate(chapter_summaries):
            progress = f"[{i+1}/{total_chapters}]"
            print(f"{progress} Downloading: {summary.title}")

            try:
                chapter_html = self._get_page_with_retries(provider, summary.url)
                chapter_soup = BeautifulSoup(chapter_html, 'html.parser')
                raw_chapter = provider.parse_chapter(chapter_soup, summary.url)
                chapter_content = self.chapter_normalizer.normalize(raw_chapter, i)
                builder.add_chapter(chapter_content)
            except Exception as e:
                print(f"  - FAILED to download chapter {i+1}: {e}")
                continue

            if (i + 1) % self.batch_size == 0 and i + 1 < total_chapters:
                print(f"\n--- Saving batch { (i + 1) // self.batch_size } ---")
                self.storage.save_batch(builder.build())

        novel = builder.build()
        self.storage.finish(novel)

        end_time = time.time()
        print("\n--- Download Complete ---")
        if total_chapters > 0:
            avg_time = (end_time - start_time) / total_chapters
            print(f"Total time: {end_time - start_time:.2f} seconds")
            print(f"Average time per chapter: {avg_time:.2f} seconds")

        return novel

    def _get_page_with_retries(self, provider: BaseProvider, url: str) -> str:
        for i in range(self.retry_count):
            try:
                return self.browser_context.get(url, provider.navigation_mode).html
            except NavigationException as e:
                print(f"  - Attempt {i+1}/{self.retry_count} failed for {url}: {e}")
                if i == self.retry_count - 1:
                    raise
                time.sleep(5)
        raise NavigationException(f"Failed to get page {url} after {self.retry_count} retries.")
