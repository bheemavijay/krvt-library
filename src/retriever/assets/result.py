from dataclasses import dataclass, field
from typing import List
from .asset import Asset

@dataclass
class AssetDownloadResult:
    """
    Represents the outcome of an asset download operation.
    """
    downloaded: int
    skipped: int
    failed: int
    assets: List[Asset] = field(default_factory=list)
