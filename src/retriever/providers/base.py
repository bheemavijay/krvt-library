from abc import ABC, abstractmethod
from typing import List

from src.retriever.models.raw_metadata import RawNovelMetadata
from src.retriever.models.raw_chapter import RawChapter
from src.retriever.models.provider import ChapterSummary
from src.retriever.models.novel_metadata import NovelMetadata # For get_assets
from src.retriever.models.enums import NavigationMode
from src.retriever.core.document import Document # For parsing methods
from src.retriever.assets.asset import Asset # For get_assets
from src.retriever.assets.asset_type import AssetType # For AssetType enum

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
        # Implementation remains the same, assuming urlparse is available
        from urllib.parse import urlparse
        host = urlparse(url).netloc.lower()
        return any(host == domain or host.endswith(f".{domain}") for domain in self.domains)

    @abstractmethod
    def parse_metadata(self, document: Document, source_url: str = "") -> RawNovelMetadata:
        """Parses the novel's main page into a raw metadata object."""
        pass

    @abstractmethod
    def parse_chapter_list(self, document: Document, novel_url: str = "") -> List[ChapterSummary]:
        """Parses the novel's main page to get a list of all chapter URLs and titles."""
        pass

    @abstractmethod
    def parse_chapter(self, document: Document, chapter_url: str = "") -> RawChapter:
        """Parses a chapter page into a raw chapter object."""
        pass

    def get_assets(self, metadata: NovelMetadata) -> List[Asset]:
        """
        Returns a list of assets (e.g., cover, banner) to download for the novel.
        Providers should only return Asset objects with URLs; the AssetDownloader
        is responsible for fetching and saving them.
        """
        assets = []
        if metadata.cover:
            # Infer filename from URL or use a default
            filename = metadata.cover.split('/')[-1] if '/' in metadata.cover else f"{AssetType.COVER.value}.jpg"
            assets.append(Asset(type=AssetType.COVER, url=metadata.cover, original_filename=filename))
        # Add other assets as needed
        return assets
