from urllib.parse import urljoin

from bs4 import BeautifulSoup

from src.retriever.extractors.extractor import Extractor
from src.retriever.models.raw_chapter import RawChapter

from .selectors import MvlempyrSelectors


class ChapterParser:
    def __init__(self, soup: BeautifulSoup, base_url: str):
        self.soup = soup
        self.base_url = base_url
        self.registry = MvlempyrSelectors()
        self.extractor = Extractor(self.soup, self.registry)

    def parse(self) -> RawChapter:
        title = self.extractor.extract("chapter_title").value
        content_tag = self._extract_content_tag()

        previous_url = self._extract_url("previous_chapter_url")
        next_url = self._extract_url("next_chapter_url")

        return RawChapter(
            title=title,
            url=self.base_url,
            content_html=str(content_tag) if content_tag else "",
            previous_url=previous_url,
            next_url=next_url,
            raw={"novel_url": self._extract_novel_url()},
        )

    def _extract_content_tag(self):
        for selector in self.registry.get_selectors("chapter_content"):
            tag = self.soup.select_one(selector.css)
            if tag:
                return tag
        return None

    def _extract_url(self, field: str) -> str | None:
        value = self.extractor.extract(field).value
        return urljoin(self.base_url, value) if value else None

    def _extract_novel_url(self) -> str | None:
        for selector in ["a[href*='/novel/']", "link[rel='canonical']", "meta[property='og:url']"]:
            tag = self.soup.select_one(selector)
            if not tag:
                continue
            value = tag.get("content") if selector.startswith("meta") else tag.get("href")
            if value and "/novel/" in value:
                return urljoin(self.base_url, value)
        return None
