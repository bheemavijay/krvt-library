from bs4 import BeautifulSoup

from src.retriever.models.enums import NavigationMode
from src.retriever.models.provider import ChapterSummary
from src.retriever.models.raw_chapter import RawChapter
from src.retriever.models.raw_metadata import RawNovelMetadata
from src.retriever.providers.base import BaseProvider

from .chapter_list_parser import ChapterListParser
from .chapter_parser import ChapterParser
from .metadata_parser import MetadataParser


class MvlempyrProvider(BaseProvider):
    @property
    def id(self) -> str:
        return "mvlempyr"

    @property
    def name(self) -> str:
        return "MVLEMPYR"

    @property
    def domains(self) -> list[str]:
        return ["mvlempyr.io", "www.mvlempyr.io"]

    @property
    def navigation_mode(self) -> NavigationMode:
        return NavigationMode.DOM_READY

    def parse_metadata(self, soup: BeautifulSoup, source_url: str = "") -> RawNovelMetadata:
        parser = MetadataParser(soup, source_url)
        return parser.parse()

    def parse_chapter_list(self, soup: BeautifulSoup, url: str = "") -> list[ChapterSummary]:
        parser = ChapterListParser(soup, url)
        return parser.parse()

    def parse_chapter(self, soup: BeautifulSoup, url: str = "") -> RawChapter:
        parser = ChapterParser(soup, url)
        return parser.parse()
