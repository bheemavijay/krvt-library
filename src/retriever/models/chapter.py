from dataclasses import dataclass, field
from typing import Optional

@dataclass
class Chapter:
    """
    Represents a single, normalized chapter of a novel.
    """
    id: str # Unique ID for the chapter
    index: int # 0-based index
    title: str
    url: str
    content: str # The full content of the chapter
    word_count: Optional[int] = None
    reading_time: Optional[int] = None # In minutes
    previous: Optional[str] = None # URL of the previous chapter
    next: Optional[str] = None # URL of the next chapter
    published_at: Optional[str] = None # ISO 8601

    # TODO: Remove after Phase 2 migration.
    @property
    def wordCount(self) -> Optional[int]:
        return self.word_count

    # TODO: Remove after Phase 2 migration.
    @property
    def estimatedReadTime(self) -> Optional[int]:
        return self.reading_time

    # TODO: Remove after Phase 2 migration.
    @property
    def publishedAt(self) -> Optional[str]:
        return self.published_at

    # TODO: Remove after Phase 2 migration.
    @property
    def content_text(self) -> str:
        return self.content

    # TODO: Remove after Phase 2 migration.
    @property
    def content_html(self) -> str:
        return self.content

    # TODO: Remove after Phase 2 migration.
    @property
    def reading_minutes(self) -> Optional[int]:
        return self.reading_time

    # TODO: Remove after Phase 2 migration.
    @property
    def previous_url(self) -> Optional[str]:
        return self.previous

    # TODO: Remove after Phase 2 migration.
    @property
    def next_url(self) -> Optional[str]:
        return self.next
