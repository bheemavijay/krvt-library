from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import List

class DownloadStatus(Enum):
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    FAILED = "FAILED"
    RUNNING = "RUNNING"

@dataclass(frozen=True)
class DownloadResult:
    status: DownloadStatus
    novel_id: str
    duration_ms: int
    errors: List[str] = field(default_factory=list)

    def to_dict(self):
        return asdict(self)