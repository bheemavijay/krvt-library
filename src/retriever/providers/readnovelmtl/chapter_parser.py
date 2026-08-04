from bs4 import BeautifulSoup
from src.retriever.models.raw_chapter import RawChapter
from urllib.parse import urljoin

class ChapterParser:
    def __init__(self, soup: BeautifulSoup, base_url: str):
        self.soup = soup
        self.base_url = base_url

    def parse(self) -> RawChapter:
        title_tag = self.soup.select_one('h1.mb-4, .h1, h1')
        title = title_tag.text.strip() if title_tag else None

        content_tag = self.soup.select_one('div.entry-content, article, #chapter-content')

        if not content_tag:
            return RawChapter(title=title, url=self.base_url, content_html="")

        content_html = str(content_tag)

        prev_tag = self.soup.select_one("#prev:not(.disabled) a")
        next_tag = self.soup.select_one("#next:not(.disabled) a")

        previous_url = urljoin(self.base_url, prev_tag['href']) if prev_tag and prev_tag.has_attr('href') else None
        next_url = urljoin(self.base_url, next_tag['href']) if next_tag and next_tag.has_attr('href') else None

        return RawChapter(
            title=title,
            url=self.base_url,
            content_html=content_html,
            previous_url=previous_url,
            next_url=next_url,
        )
