import re
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup

from src.retriever.extractors.extractor import Extractor
from src.retriever.models.provider import ChapterSummary

from .selectors import MvlempyrSelectors


class ChapterListParser:
    def __init__(self, soup: BeautifulSoup, base_url: str):
        self.soup = soup
        self.base_url = base_url
        self.registry = MvlempyrSelectors()
        self.extractor = Extractor(self.soup, self.registry)

    def parse(self) -> list[ChapterSummary]:
        chapters = self._extract_linked_chapters()
        if chapters:
            return chapters

        return self._extract_pattern_chapters()

    def _extract_linked_chapters(self) -> list[ChapterSummary]:
        chapters = []
        seen = set()
        for tag in self.extractor.extract_tags("chapters"):
            href = tag.get("href")
            if not href:
                continue
            url = urljoin(self.base_url, href)
            if "/chapter/" not in url or url in seen:
                continue
            seen.add(url)
            chapters.append(
                ChapterSummary(
                    title=tag.get_text(" ", strip=True) or f"Chapter {len(chapters) + 1}",
                    url=url,
                    chapter_number=self._extract_chapter_number(url),
                )
            )
        return chapters

    def _extract_pattern_chapters(self) -> list[ChapterSummary]:
        chapter_count = self._extract_chapter_count()
        chapter_key = self._extract_chapter_key()
        if not chapter_count or not chapter_key:
            return []

        origin = self._origin()
        return [
            ChapterSummary(
                title=f"Chapter {index}",
                url=f"{origin}/chapter/{chapter_key}-{index}",
                chapter_number=index,
            )
            for index in range(1, chapter_count + 1)
        ]

    def _extract_chapter_count(self) -> int | None:
        direct = self.soup.select_one("div#chapter-count")
        if direct:
            match = re.search(r"\d+", direct.get_text(" ", strip=True))
            if match:
                return int(match.group(0))

        scripts = "\n".join(script.get_text() for script in self.soup.select("script"))
        match = re.search(r"numberOfChapters.*?(\d+)", scripts, re.IGNORECASE)
        return int(match.group(1)) if match else None

    def _extract_chapter_key(self) -> str | None:
        html = str(self.soup)
        href_match = re.search(r"/chapter/(\d+)-", html)
        if href_match:
            return href_match.group(1)

        script_match = re.search(r"(?:novelId|novel_id|bookId|book_id)[\"'\s:]+(\d+)", html, re.IGNORECASE)
        if script_match:
            return script_match.group(1)

        parsed = urlparse(self.base_url)
        slug = parsed.path.rstrip("/").split("/")[-1].replace(".html", "")
        return slug or None

    def _extract_chapter_number(self, url: str) -> int | None:
        match = re.search(r"-(\d+)(?:/?(?:#.*)?$)", url)
        return int(match.group(1)) if match else None

    def _origin(self) -> str:
        parsed = urlparse(self.base_url)
        return f"{parsed.scheme}://{parsed.netloc}" if parsed.scheme and parsed.netloc else "https://www.mvlempyr.io"
