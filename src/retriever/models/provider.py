from dataclasses import dataclass, field
from typing import List, Optional

@dataclass
class NovelMetadata:
    title: Optional[str] = None
    alternative_title: Optional[str] = None
    author: Optional[str] = None
    description: Optional[str] = None
    cover_url: Optional[str] = None
    genres: List[str] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)
    status: Optional[str] = None
    rating: Optional[float] = None
    chapter_count: Optional[int] = None
    source: Optional[str] = None
    last_updated: Optional[str] = None

@dataclass
class ChapterSummary:
    title: str
    url: str
    chapter_number: Optional[int] = None
    release_date: Optional[str] = None

@dataclass
class ChapterContent:
    title: Optional[str]
    url: str
    content_html: str
    content_text: str
    word_count: int
    reading_minutes: int
    previous_url: Optional[str] = None
    next_url: Optional[str] = None
    images: List[str] = field(default_factory=list)
    notes: List[str] = field(default_factory=list)

@dataclass
class Novel:
    """The final, normalized novel object."""
    metadata: NovelMetadata
    chapters: List[ChapterContent] = field(default_factory=list)
