from dataclasses import dataclass
from typing import Optional

@dataclass(frozen=True)
class Settings:
    profile_path: str
    headless: bool = True
    navigation_timeout_ms: int = 30000
    cloudflare_timeout_seconds: int = 180
    browser_executable_path: Optional[str] = None
