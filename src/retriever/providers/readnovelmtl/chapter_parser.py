from bs4 import BeautifulSoup
from src.retriever.models.provider import ChapterContent
from urllib.parse import urljoin

class ChapterParser:
    def __init__(self, soup: BeautifulSoup, base_url: str):
        self.soup = soup
        self.base_url = base_url

    def parse(self) -> ChapterContent:
        title_tag = self.soup.select_one('h1.fs-3')
        title = title_tag.text.strip() if title_tag else None

        content_tag = self.soup.select_one('div#content')

        if not content_tag:
            return ChapterContent(
                title=title,
                content_html="",
                content_text="",
                word_count=0,
                reading_minutes=0
            )

        # --- Clean the content ---
        # Remove ads and other unwanted elements from within the content block
        for unwanted in content_tag.select('div.text-center, script, style'):
            unwanted.decompose()

        # --- Extract Paragraphs ---
        paragraphs = []
        for p in content_tag.find_all("p", recursive=False):
            text = p.get_text(" ", strip=True)
            # Filter out empty paragraphs and promotional text
            if text and "continue read on readnovelmtl.com" not in text.lower():
                paragraphs.append(text)

        content_html = str(content_tag)
        content_text = "\n\n".join(paragraphs)

        word_count = len(content_text.split())
        reading_minutes = round(word_count / 200)

        # --- Extract Navigation URLs ---
        prev_tag = self.soup.select_one("#prev:not(.disabled) a")
        next_tag = self.soup.select_one("#next:not(.disabled) a")

        previous_url = urljoin(self.base_url, prev_tag['href']) if prev_tag and prev_tag.has_attr('href') else None
        next_url = urljoin(self.base_url, next_tag['href']) if next_tag and next_tag.has_attr('href') else None

        images = [urljoin(self.base_url, img['src']) for img in content_tag.select('img') if img.has_attr('src')]

        return ChapterContent(
            title=title,
            content_html=content_html,
            content_text=content_text,
            word_count=word_count,
            reading_minutes=reading_minutes,
            previous_url=previous_url,
            next_url=next_url,
            images=images,
            notes=[]
        )
