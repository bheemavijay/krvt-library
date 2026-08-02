from bs4 import BeautifulSoup
from .metadata_parser import MetadataParser
from .chapter_list_parser import ChapterListParser
from .chapter_parser import ChapterParser
from src.retriever.models.provider import NovelMetadata, ChapterSummary, ChapterContent

class ReadNovelMTLProvider:
    def parse_metadata(self, soup: BeautifulSoup) -> NovelMetadata:
        parser = MetadataParser(soup)
        return parser.parse()

    def parse_chapter_list(self, soup: BeautifulSoup, url: str) -> list[ChapterSummary]:
        parser = ChapterListParser(soup, url)
        return parser.parse()

    def parse_chapter(self, soup: BeautifulSoup, url: str) -> ChapterContent:
        parser = ChapterParser(soup, url)
        return parser.parse()
