from bs4 import BeautifulSoup
from src.retriever.extractors.extractor import Extractor
from src.retriever.models.provider import ChapterSummary
from .selectors import FanMtlSelectors
from urllib.parse import urljoin

class ChapterListParser:
    def __init__(self, soup: BeautifulSoup, base_url: str):
        self.soup = soup
        self.base_url = base_url
        self.registry = FanMtlSelectors()
        self.extractor = Extractor(self.soup, self.registry)

    def parse(self) -> list[ChapterSummary]:
        chapter_tags = self.extractor.extract_tags('chapters')
        chapters = []
        for tag in chapter_tags:
            if tag.has_attr('href') and tag.text:
                # Clean up the title text which contains number and update time
                title_strong = tag.find('strong', class_='chapter-title')
                if title_strong:
                    title = title_strong.text.strip()
                    chapter_url = urljoin(self.base_url, tag['href'])
                    chapters.append(ChapterSummary(
                        title=title,
                        url=chapter_url
                    ))

        # The site lists chapters oldest to newest, so no reversal is needed.
        return chapters
