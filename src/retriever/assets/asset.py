from dataclasses import dataclass
from typing import Optional
from .asset_type import AssetType

@dataclass
class Asset:
    """
    Represents a downloadable asset associated with a novel.
    """
    type: AssetType
    url: str
    original_filename: Optional[str] = None
    mime_type: Optional[str] = None
