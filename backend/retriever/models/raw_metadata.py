from dataclasses import dataclass, field
from typing import List, Optional

@dataclass
class RawNovelMetadata:
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
    labels: List[str] = field(default_factory=list)
    rating: Optional[float] = None
    ratingCount: Optional[int] = None
    views: Optional[int] = None
    bookmarks: Optional[int] = None
    chapterCount: Optional[int] = None
    firstChapterUrl: Optional[str] = None
    lastChapterUrl: Optional[str] = None
    language: Optional[str] = None
    raw: dict = field(default_factory=dict)
