from bs4 import BeautifulSoup
from src.retriever.extractors.extractor import Extractor
from src.retriever.models.provider import ChapterSummary
from .selectors import ReadNovelMtlSelectors
from urllib.parse import urljoin

class ChapterListParser:
    def __init__(self, soup: BeautifulSoup, base_url: str):
        self.soup = soup
        self.base_url = base_url
        self.registry = ReadNovelMtlSelectors()
        self.extractor = Extractor(self.soup, self.registry)

    def parse(self) -> list[ChapterSummary]:
        chapter_tags = self.extractor.extract_tags('chapters')
        chapters = []
        for tag in chapter_tags:
            if tag.has_attr('href') and tag.text:
                chapter_url = urljoin(self.base_url, tag['href'])
                chapters.append(ChapterSummary(
                    title=tag.text.strip(),
                    url=chapter_url
                ))
        return chapters
