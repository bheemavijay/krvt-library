from bs4 import BeautifulSoup
from src.retriever.extractors.extractor import Extractor
from src.retriever.models.raw_metadata import RawNovelMetadata
from .selectors import FanMtlSelectors
import re

class MetadataParser:
    def __init__(self, soup: BeautifulSoup, source_url: str):
        self.soup = soup
        self.source_url = source_url
        self.registry = FanMtlSelectors()
        self.extractor = Extractor(self.soup, self.registry)

    def parse(self) -> RawNovelMetadata:
        title = self.extractor.extract('title').value
        alt_title = self.extractor.extract('alternative_title').value
        author = self.extractor.extract('author').value
        description = self.extractor.extract('description').value
        cover_url = self.extractor.extract('cover').value
        status = self.extractor.extract('status').value

        # Extract all labels without classification.
        labels = []
        seen = set()
        for field in ("genres", "tags"):
            for tag in self.extractor.extract_tags(field):
                text = tag.get_text(" ", strip=True)
                if text and text not in seen:
                    labels.append(text)
                    seen.add(text)

        chapter_count_str = self.extractor.extract('chapter_count').value
        chapter_count = int(re.search(r'\d+', chapter_count_str).group()) if chapter_count_str else None

        return RawNovelMetadata(
            provider="fanmtl",
            sourceUrl=self.source_url,
            title=title,
            alternativeTitles=[alt_title] if alt_title else [],
            author=author,
            description=description,
            coverUrl=cover_url,
            status=status,
            labels=labels,
            chapterCount=chapter_count,
        )
