from dataclasses import dataclass
from typing import Any, Optional
from .task import DownloadTask

@dataclass
class WorkerResult:
    """
    Represents the result of a single DownloadTask.
    """
    task: DownloadTask
    success: bool
    attempts: int
    duration_ms: int
    result: Optional[Any] = None
    exception: Optional[Exception] = None
