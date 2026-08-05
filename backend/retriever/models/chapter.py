from dataclasses import dataclass
from typing import List

@dataclass
class Chapter:
    order: int
    title: str
    content: List[str]
    source_url: str
