from dataclasses import dataclass, field
from typing import List, Optional

@dataclass
class NovelMetadata:
    """
    The canonical, frozen metadata model for a novel.
    """
    title: str
    alternative_titles: List[str] = field(default_factory=list)
    author: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    language: Optional[str] = None
    categories: List[str] = field(default_factory=list) # Canonical genres
    tags: List[str] = field(default_factory=list)
    rating: Optional[float] = None
    views: Optional[int] = None
    chapter_count: Optional[int] = None
    word_count: Optional[int] = None
    # TODO: Remove after Phase 2 migration. Slug belongs in Source, not Metadata.
    slug: Optional[str] = None

    # TODO: Remove after Phase 2 migration.
    @property
    def alternativeTitles(self) -> List[str]:
        return self.alternative_titles

    # TODO: Remove after Phase 2 migration.
    @property
    def chapterCount(self) -> Optional[int]:
        return self.chapter_count

    # TODO: Remove after Phase 2 migration.
    @property
    def wordCount(self) -> Optional[int]:
        return self.word_count
