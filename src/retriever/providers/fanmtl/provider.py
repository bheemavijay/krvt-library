from typing import List
from ..base import BaseProvider
from ..manifest import ProviderManifest
from ..capabilities import ProviderCapabilities
from ..context import ProviderContext
from src.retriever.models.enums import NavigationMode
from src.retriever.core.document import Document
from src.retriever.models.raw_metadata import RawNovelMetadata
from src.retriever.models.raw_chapter import RawChapter
from src.retriever.models.provider import ChapterSummary
from .metadata_parser import FanMTLMetadataParser
from .chapter_list_parser import FanMTLChapterListParser
from .chapter_parser import FanMTLChapterParser

class FanMTLProvider(BaseProvider):
    """
    Provider for FanMTL.
    """
    manifest = ProviderManifest(
        id="fanmtl",
        name="FanMTL",
        version="1.0.1",
        author="KRVT",
        homepage="https://fanmtl.com",
        url_patterns=[r"https?://(www\.)?fanmtl\.com/novel/.*"],
        supported_languages=["en"],
        capabilities=ProviderCapabilities(
            max_parallel=4,
            requests_per_second=2,
            burst=3,
            cloudflare=True,
            navigation_mode=NavigationMode.CLOUDFLARE
        ),
        api_version=1
    )

    def __init__(self, context: ProviderContext):
        super().__init__(context)

    def parse_metadata(self, document: Document, source_url: str = "") -> RawNovelMetadata:
        parser = FanMTLMetadataParser(document.soup)
        return parser.parse()

    def parse_chapter_list(self, document: Document, novel_url: str = "") -> List[ChapterSummary]:
        parser = FanMTLChapterListParser(document.soup, novel_url)
        return parser.parse()

    def parse_chapter(self, document: Document, chapter_url: str = "") -> RawChapter:
        parser = FanMTLChapterParser(document.soup)
        return parser.parse()
