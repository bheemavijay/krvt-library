from abc import ABC, abstractmethod
from bs4 import BeautifulSoup
from urllib.parse import urlparse
from typing import List

from src.retriever.models.raw_metadata import RawNovelMetadata
from src.retriever.models.raw_chapter import RawChapter
from src.retriever.models.provider import ChapterSummary # ChapterSummary is a simple DTO, can remain for now
from src.retriever.models.enums import NavigationMode

class BaseProvider(ABC):
    """
    The frozen contract for all data source providers.
    A provider's only responsibility is to parse HTML into raw, un-normalized data models.
    It should contain no business logic, no normalization, and no interaction with other system components.
    """
    @property
    @abstractmethod
    def id(self) -> str:
        """A unique, lowercase, machine-readable identifier for the provider."""
        pass

    @property
    @abstractmethod
    def name(self) -> str:
        """A human-readable name for the provider."""
        pass

    @property
    def version(self) -> str:
        """The version of the provider parser, e.g., "1.0.0"."""
        return "1.0.0"

    @property
    @abstractmethod
    def domains(self) -> List[str]:
        """A list of domains this provider supports."""
        pass

    @property
    @abstractmethod
    def navigation_mode(self) -> NavigationMode:
        """The navigation strategy to use for this provider."""
        pass

    def supports(self, url: str) -> bool:
        """Returns True when the URL host matches one of the provider domains."""
        host = urlparse(url).netloc.lower()
        return any(host == domain or host.endswith(f".{domain}") for domain in self.domains)

    @abstractmethod
    def parse_metadata(self, soup: BeautifulSoup, source_url: str = "") -> RawNovelMetadata:
        """Parses the novel's main page into a raw metadata object."""
        pass

    @abstractmethod
    def parse_chapter_list(self, soup: BeautifulSoup, novel_url: str = "") -> List[ChapterSummary]:
        """Parses the novel's main page to get a list of all chapter URLs and titles."""
        pass

    @abstractmethod
    def parse_chapter(self, soup: BeautifulSoup, chapter_url: str = "") -> RawChapter:
        """Parses a chapter page into a raw chapter object."""
        pass
