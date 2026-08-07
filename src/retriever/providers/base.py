from abc import ABC, abstractmethod
from typing import List

from src.retriever.models.raw_metadata import RawNovelMetadata
from src.retriever.models.raw_chapter import RawChapter
from src.retriever.models.provider import ChapterSummary
from src.retriever.models.novel_metadata import NovelMetadata
from src.retriever.models.enums import NavigationMode
from src.retriever.core.document import Document
from src.retriever.assets.asset import Asset
from .capabilities import ProviderCapabilities

class BaseProvider(ABC):
    """
    The frozen contract for all data source providers.
    """
    @property
    @abstractmethod
    def id(self) -> str:
        pass

    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @property
    def version(self) -> str:
        return "1.0.0"

    @property
    @abstractmethod
    def domains(self) -> List[str]:
        pass

    @property
    @abstractmethod
    def navigation_mode(self) -> NavigationMode:
        pass

    @property
    def capabilities(self) -> ProviderCapabilities:
        """
        Returns the provider's capabilities.
        Defaults to a conservative setting.
        """
        return ProviderCapabilities()

    def supports(self, url: str) -> bool:
        from urllib.parse import urlparse
        host = urlparse(url).netloc.lower()
        return any(host == domain or host.endswith(f".{domain}") for domain in self.domains)

    @abstractmethod
    def parse_metadata(self, document: Document, source_url: str = "") -> RawNovelMetadata:
        pass

    @abstractmethod
    def parse_chapter_list(self, document: Document, novel_url: str = "") -> List[ChapterSummary]:
        pass

    @abstractmethod
    def parse_chapter(self, document: Document, chapter_url: str = "") -> RawChapter:
        pass

    def get_assets(self, metadata: NovelMetadata) -> List[Asset]:
        return []
