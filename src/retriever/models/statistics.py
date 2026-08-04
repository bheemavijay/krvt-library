from dataclasses import dataclass
from typing import Optional

@dataclass
class Statistics:
    """
    Contains statistics about the novel's lifecycle within the system.
    """
    downloaded: int = 0
    failed: int = 0
    created_at: Optional[str] = None # ISO 8601
    updated_at: Optional[str] = None # ISO 8601

    # TODO: Remove after Phase 2 migration.
    @property
    def downloads(self) -> int:
        return self.downloaded

    # TODO: Remove after Phase 2 migration.
    @property
    def createdAt(self) -> Optional[str]:
        return self.created_at

    # TODO: Remove after Phase 2 migration.
    @property
    def updatedAt(self) -> Optional[str]:
        return self.updated_at
