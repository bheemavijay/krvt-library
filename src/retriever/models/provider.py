from dataclasses import dataclass, field
from typing import List, Optional

@dataclass(frozen=True)
class NovelMetadata:
    title: Optional[str] = None
    alternative_title: Optional[str] = None
    author: Optional[str] = None
    description: Optional[str] = None
    cover_url: Optional[str] = None
    genres: List[str] = field(default_factory=list)
    status: Optional[str] = None
    rating: Optional[float] = None
    chapter_count: Optional[int] = None

@dataclass(frozen=True)
class ChapterSummary:
    title: str
    url: str

@dataclass(frozen=True)
class ChapterContent:
    title: Optional[str]
    content_html: str
    content_text: str
    word_count: int
    reading_minutes: int
    previous_url: Optional[str] = None
    next_url: Optional[str] = None
    images: List[str] = field(default_factory=list)
    notes: List[str] = field(default_factory=list)

@dataclass(frozen=True)
class Novel:
    """The unified result of a provider's parsing operation."""
    metadata: NovelMetadata
    chapters: List[ChapterSummary]
