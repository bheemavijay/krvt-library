from dataclasses import dataclass
from datetime import datetime
from typing import Dict, Optional

@dataclass(frozen=True)
class RawBrowserResponse:
    url: str
    html: str
    title: str
    headers: Dict
    cookies: Dict
    metadata: Dict

@dataclass(frozen=True)
class Page:
    url: str
    html: str
    title: str
    timestamp: datetime
