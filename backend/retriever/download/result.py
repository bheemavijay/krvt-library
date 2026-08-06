from dataclasses import dataclass, field
from typing import List
from enum import Enum

class DownloadStatus(Enum):
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    PARTIAL = "PARTIAL"
    SKIPPED = "SKIPPED"

@dataclass
class DownloadResult:
    """
    Represents the outcome of a download operation.
    This is a rich object designed to provide detailed feedback to the caller.
    """
    novel_id: str
    status: DownloadStatus
    provider: str

    # Chapter counts
    downloaded: int
    total: int
    skipped: int
    failed: int

    # Asset counts
    asset_downloaded: int = 0
    asset_failed: int = 0

    duration_ms: int
    errors: List[str] = field(default_factory=list)
