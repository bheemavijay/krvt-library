import re
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from src.retriever.extractors.extractor import Extractor
from src.retriever.models.raw_metadata import RawNovelMetadata

from .selectors import MvlempyrSelectors


class MetadataParser:
    def __init__(self, soup: BeautifulSoup, source_url: str):
        self.soup = soup
        self.source_url = source_url
        self.registry = MvlempyrSelectors()
        self.extractor = Extractor(self.soup, self.registry)

    def parse(self) -> RawNovelMetadata:
        title = self.extractor.extract("title").value or "Unknown Title"
        author = self.extractor.extract("author").value
        cover_url = self._absolute_url(self.extractor.extract("cover").value)
        description = self.extractor.extract("description").value
        status = self._extract_labeled_text("Status") or self.extractor.extract("status").value
        rating = self._extract_rating()
        labels = self._extract_labels()
        chapter_count = self._extract_chapter_count()
        alternative_titles = self._extract_alternative_titles()

        return RawNovelMetadata(
            provider="mvlempyr",
            sourceUrl=self.source_url,
            title=title,
            alternativeTitles=alternative_titles,
            author=author,
            description=description,
            coverUrl=cover_url,
            status=status,
            labels=labels,
            rating=rating,
            chapterCount=chapter_count,
        )

    def _extract_labels(self) -> list[str]:
        labels = []
        seen = set()
        for tag in self.extractor.extract_tags("labels"):
            text = tag.get_text(" ", strip=True).lstrip("#").strip()
            if text and text not in seen:
                labels.append(text)
                seen.add(text)
        return labels

    def _extract_rating(self) -> float | None:
        raw_rating = self.extractor.extract("rating").value
        if not raw_rating:
            return None
        match = re.search(r"(\d+(?:\.\d+)?)", str(raw_rating))
        return float(match.group(1)) if match else None

    def _extract_chapter_count(self) -> int | None:
        direct = self.soup.select_one("div#chapter-count")
        if direct:
            match = re.search(r"\d+", direct.get_text(" ", strip=True))
            if match:
                return int(match.group(0))

        scripts = "\n".join(script.get_text() for script in self.soup.select("script"))
        match = re.search(r"numberOfChapters.*?(\d+)", scripts, re.IGNORECASE)
        return int(match.group(1)) if match else None

    def _extract_alternative_titles(self) -> list[str]:
        values = []
        seen = set()
        selectors = [".alternative-title", ".alt-title"]
        labeled = self._extract_labeled_text("Also known as")
        for raw in [*(tag.get_text(" ", strip=True) for selector in selectors for tag in self.soup.select(selector)), labeled]:
            if not raw:
                continue
            cleaned = re.sub(r"^Also known as[:\s]*", "", raw, flags=re.IGNORECASE)
            for title in cleaned.split(","):
                title = title.strip()
                if title and title not in seen:
                    values.append(title)
                    seen.add(title)
        return values

    def _extract_labeled_text(self, label: str) -> str | None:
        label_pattern = re.compile(label, re.IGNORECASE)
        for tag in self.soup.find_all(string=label_pattern):
            parent = tag.parent
            if not parent:
                continue
            sibling = parent.find_next_sibling()
            text = sibling.get_text(" ", strip=True) if sibling else parent.get_text(" ", strip=True)
            cleaned = re.sub(rf"^{re.escape(label)}[:\s]*", "", text, flags=re.IGNORECASE).strip()
            if cleaned:
                return cleaned
        return None

    def _absolute_url(self, url: str | None) -> str | None:
        return urljoin(self.source_url, url) if url else None
