from ..models.raw_chapter import RawChapter
from ..models.chapter import Chapter
from bs4 import BeautifulSoup
import re

def _count_words(text: str) -> int:
    """Counts the words in a given string."""
    return len(re.findall(r'\w+', text))

def _estimate_read_time(word_count: int, wpm: int = 200) -> int:
    """Estimates reading time in minutes."""
    if not word_count or word_count == 0:
        return 0
    return max(1, round(word_count / wpm))

class ChapterNormalizer:
    """
    Takes a RawChapter object from a provider and converts it into a
    canonical, system-wide Chapter object.
    """
    def normalize(self, raw_chapter: RawChapter, index: int) -> Chapter:
        soup = BeautifulSoup(raw_chapter.content_html or "", "html.parser")

        for unwanted in soup.select("script, style, noscript"):
            unwanted.decompose()

        content_nodes = soup.find_all(["p", "li"]) or soup.find_all(["div"])
        paragraphs = [
            text
            for text in (node.get_text(" ", strip=True) for node in content_nodes)
            if text
        ]
        content_text = "\n\n".join(paragraphs) or soup.get_text("\n\n", strip=True)

        word_count = _count_words(content_text)

        return Chapter(
            id=f"ch-{index + 1}",
            index=index,
            title=raw_chapter.title or f"Chapter {index + 1}",
            url=raw_chapter.url,
            content=content_text,
            word_count=word_count,
            reading_time=_estimate_read_time(word_count),
            previous=raw_chapter.previous_url,
            next=raw_chapter.next_url,
        )
