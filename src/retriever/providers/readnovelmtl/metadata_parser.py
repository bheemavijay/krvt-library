from bs4 import BeautifulSoup
import re

from src.retriever.models.raw_metadata import RawNovelMetadata
from src.retriever.extractors.extractor import Extractor
from .selectors import ReadNovelMtlSelectors

class MetadataParser:
    def __init__(self, soup: BeautifulSoup, source_url: str):
        self.soup = soup
        self.source_url = source_url
        self.registry = ReadNovelMtlSelectors()
        self.extractor = Extractor(self.soup, self.registry)

    def parse(self) -> RawNovelMetadata:
        """Parses the raw, un-normalized metadata from the page."""
        title = self.extractor.extract('title').value
        alt_title = self.extractor.extract('alternative_title').value
        author = self.extractor.extract('author').value
        description = self.extractor.extract('description').value
        cover_url = self.extractor.extract('cover').value
        status_raw = self.extractor.extract('status').value
        labels = []
        seen = set()
        for tag in self.extractor.extract_tags('genres'):
            text = tag.get_text(" ", strip=True)
            if text and text not in seen:
                labels.append(text)
                seen.add(text)
        rating_str = self.extractor.extract('rating').value
        rating = float(rating_str) if rating_str else None
        views_str = self.extractor.extract('views').value
        views = int(re.search(r'\d+', views_str).group()) if views_str and re.search(r'\d+', views_str) else None
        chapter_count_str = self.extractor.extract('chapter_count').value
        chapter_count = int(re.search(r'\d+', chapter_count_str).group()) if chapter_count_str and re.search(r'\d+', chapter_count_str) else None

        return RawNovelMetadata(
            provider="readnovelmtl",
            sourceUrl=self.source_url,
            title=title,
            alternativeTitles=[alt_title] if alt_title else [],
            author=author,
            description=description,
            coverUrl=cover_url,
            status=status_raw,
            labels=labels,
            rating=rating,
            views=views,
            chapterCount=chapter_count,
        )
