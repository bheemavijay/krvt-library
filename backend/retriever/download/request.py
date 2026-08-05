from dataclasses import dataclass, field
from typing import Optional

@dataclass
class DownloadRequest:
    """
    Encapsulates all parameters for a download operation.
    This provides a stable and extensible API for the DownloadEngine.
    """
    url: str

    # Batching and Concurrency
    batch_size: int = 25

    # Control Flow
    resume: bool = True
    overwrite: bool = False
    chapter_limit: Optional[int] = None # None means no limit

    # Asset Downloading
    download_assets: bool = True

    # Future-proofing
    priority: int = 0
    rate_limit: Optional[float] = None # Requests per second
    proxy: Optional[str] = None
    cookies: Optional[dict] = field(default_factory=dict)
