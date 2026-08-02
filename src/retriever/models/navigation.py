from dataclasses import dataclass
from typing import Optional
from .enums import NavigationStatus
from .page import Page

@dataclass(frozen=True)
class NavigationResult:
    status: NavigationStatus
    page: Optional[Page]
    final_url: str
    retries: int
    elapsed_ms: float
    error: Optional[str]
