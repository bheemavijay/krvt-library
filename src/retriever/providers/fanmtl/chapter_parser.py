from bs4 import BeautifulSoup
from src.retriever.models.raw_chapter import RawChapter
from src.retriever.extractors.extractor import Extractor
from .selectors import FanMtlSelectors
from urllib.parse import urljoin

class ChapterParser:
    def __init__(self, soup: BeautifulSoup, base_url: str):
        self.soup = soup
        self.base_url = base_url
        self.registry = FanMtlSelectors()
        self.extractor = Extractor(self.soup, self.registry)

    def parse(self) -> RawChapter:
        title = self.extractor.extract('chapter_title').value

        content_tag = self.soup.select_one(self.registry.get_selectors('chapter_content')[0].css)

        if not content_tag:
            return RawChapter(title=title, url=self.base_url, content_html="")

        # Remove ads
        for ad in content_tag.select('div.TPuhiHlg'):
            ad.decompose()

        content_html = str(content_tag)

        prev_url_path = self.extractor.extract('prev_chapter_url').value
        next_url_path = self.extractor.extract('next_chapter_url').value

        previous_url = urljoin(self.base_url, prev_url_path) if prev_url_path and "javascript" not in prev_url_path else None
        next_url = urljoin(self.base_url, next_url_path) if next_url_path and "javascript" not in next_url_path else None

        return RawChapter(
            title=title,
            url=self.base_url,
            content_html=content_html,
            previous_url=previous_url,
            next_url=next_url
        )
