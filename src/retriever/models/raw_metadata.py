from dataclasses import dataclass, field
from typing import List, Optional

@dataclass
class RawNovelMetadata:
    """
    A raw, un-normalized data structure representing metadata scraped directly from a provider.
    Providers should populate this model without any business logic (e.g., genre/tag splitting).
    """
    provider: str
    sourceUrl: str
    title: str
    alternativeTitles: List[str] = field(default_factory=list)
    author: Optional[str] = None
    artist: Optional[str] = None
    description: Optional[str] = None
    coverUrl: Optional[str] = None
    bannerUrl: Optional[str] = None
    status: Optional[str] = None
    labels: List[str] = field(default_factory=list) # Raw list of genres, tags, categories, etc.
    rating: Optional[float] = None
    ratingCount: Optional[int] = None
    views: Optional[int] = None
    bookmarks: Optional[int] = None
    chapterCount: Optional[int] = None
    firstChapterUrl: Optional[str] = None
    lastChapterUrl: Optional[str] = None
    language: Optional[str] = None
    raw: dict = field(default_factory=dict) # For any provider-specific extra data
