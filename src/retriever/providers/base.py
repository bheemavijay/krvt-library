from abc import ABC, abstractmethod
from bs4 import BeautifulSoup
from src.retriever.models.provider import NovelMetadata, ChapterSummary, ChapterContent

class BaseProvider(ABC):
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
    @abstractmethod
    def domains(self) -> list[str]:
        """A list of domains this provider supports."""
        pass

    def supports(self, url: str) -> bool:
        """Checks if the provider can handle the given URL."""
        from urllib.parse import urlparse
        domain = urlparse(url).netloc
        return any(supported_domain in domain for supported_domain in self.domains)

    @abstractmethod
    def parse_metadata(self, soup: BeautifulSoup) -> NovelMetadata:
        pass

    @abstractmethod
    def parse_chapter_list(self, soup: BeautifulSoup, url: str) -> list[ChapterSummary]:
        pass

    @abstractmethod
    def parse_chapter(self, soup: BeautifulSoup, url: str) -> ChapterContent:
        pass
