from bs4 import BeautifulSoup
from ..base import BaseProvider
from .metadata_parser import MetadataParser
from .chapter_list_parser import ChapterListParser
from .chapter_parser import ChapterParser
from src.retriever.models.provider import NovelMetadata, ChapterSummary, ChapterContent

class ReadNovelMTLProvider(BaseProvider):
    @property
    def id(self) -> str:
        return "readnovelmtl"

    @property
    def name(self) -> str:
        return "ReadNovelMTL"

    @property
    def domains(self) -> list[str]:
        return ["readnovelmtl.com"]

    def parse_metadata(self, soup: BeautifulSoup) -> NovelMetadata:
        parser = MetadataParser(soup)
        return parser.parse()

    def parse_chapter_list(self, soup: BeautifulSoup, url: str) -> list[ChapterSummary]:
        parser = ChapterListParser(soup, url)
        return parser.parse()

    def parse_chapter(self, soup: BeautifulSoup, url: str) -> ChapterContent:
        parser = ChapterParser(soup, url)
        return parser.parse()
