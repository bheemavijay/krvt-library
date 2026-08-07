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
from .context import ProviderContext
from .manifest import ProviderManifest

class BaseProvider(ABC):
    """
    The frozen contract for all data source providers.
    """
    manifest: ProviderManifest

    def __init__(self, context: ProviderContext):
        self.context = context

    @property
    def id(self) -> str:
        return self.manifest.id

    @property
    def name(self) -> str:
        return self.manifest.name

    @property
    def version(self) -> str:
        return self.manifest.version

    @property
    def capabilities(self) -> ProviderCapabilities:
        return self.manifest.capabilities

    @property
    def navigation_mode(self) -> NavigationMode:
        return self.manifest.capabilities.navigation_mode

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
