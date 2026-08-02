from bs4 import BeautifulSoup
from src.retriever.extractors.extractor import Extractor
from src.retriever.models.provider import NovelMetadata
from .selectors import ReadNovelMtlSelectors
import re

class MetadataParser:
    def __init__(self, soup: BeautifulSoup):
        self.soup = soup
        self.registry = ReadNovelMtlSelectors()
        self.extractor = Extractor(self.soup, self.registry)

    def parse(self) -> NovelMetadata:
        title = self.extractor.extract('title').value
        alt_title = self.extractor.extract('alternative_title').value
        author = self.extractor.extract('author').value
        description = self.extractor.extract('description').value
        cover_url = self.extractor.extract('cover').value
        status = self.extractor.extract('status').value

        genres = [tag.text for tag in self.extractor.extract_tags('genres')]

        rating_str = self.extractor.extract('rating').value
        rating = float(rating_str) if rating_str else None

        chapter_count_str = self.extractor.extract('chapter_count').value
        chapter_count = int(re.search(r'\d+', chapter_count_str).group()) if chapter_count_str else None

        return NovelMetadata(
            title=title,
            alternative_title=alt_title,
            author=author,
            description=description,
            cover_url=cover_url,
            genres=genres,
            status=status,
            rating=rating,
            chapter_count=chapter_count,
        )
