from dataclasses import dataclass, field
from typing import List, Optional

@dataclass
class NovelMetadata:
    id: str
    provider: str
    slug: str
    title: str
    alternativeTitles: List[str] = field(default_factory=list)
    author: Optional[str] = None
    artist: Optional[str] = None
    description: Optional[str] = None
    cover: Optional[str] = None  # Local path to cover image
    banner: Optional[str] = None # Local path to banner image
    status: Optional[str] = None # Normalized status (e.g., "COMPLETED", "ONGOING")
    genres: List[str] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)
    rating: Optional[float] = None
    ratingCount: Optional[int] = None
    views: Optional[int] = None
    bookmarks: Optional[int] = None
    chapterCount: Optional[int] = None
    language: Optional[str] = None
    sourceUrl: str
    createdAt: Optional[str] = None # ISO formatted datetime string
    updatedAt: Optional[str] = None # ISO formatted datetime string
