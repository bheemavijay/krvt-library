from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional

from .novel_metadata import NovelMetadata
from .media import Media
from .chapter import Chapter
from .statistics import Statistics
from .source import Source

@dataclass
class Novel:
    """
    The final, frozen, canonical representation of a novel in the KRVT system.
    This is the single source of truth that all components should target.
    """
    metadata: NovelMetadata
    media: Media = field(default_factory=Media)
    source: Optional[Source] = None
    statistics: Statistics = field(default_factory=Statistics)
    chapters: List[Chapter] = field(default_factory=list)
    extras: Dict[str, Any] = field(default_factory=dict) # Provider-specific raw data
