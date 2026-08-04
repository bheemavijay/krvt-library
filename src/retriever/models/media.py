from dataclasses import dataclass, field
from typing import List, Optional

@dataclass
class Media:
    """
    Represents all media assets associated with a novel.
    Paths should be relative to the novel's storage directory.
    """
    cover: Optional[str] = None
    banner: Optional[str] = None
    gallery: List[str] = field(default_factory=list)
    thumbnail: Optional[str] = None

    # TODO: Remove after Phase 2 migration.
    @property
    def thumbnails(self) -> List[str]:
        return [self.thumbnail] if self.thumbnail else []
