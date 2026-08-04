from dataclasses import dataclass, field
from typing import List, Optional

@dataclass
class RawChapter:
    """
    Represents the raw, un-normalized content of a chapter scraped directly from a provider.
    """
    title: Optional[str]
    url: str
    content_html: str
    previous_url: Optional[str] = None
    next_url: Optional[str] = None
    raw: dict = field(default_factory=dict)
