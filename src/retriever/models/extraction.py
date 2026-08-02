from dataclasses import dataclass
from typing import Any, Optional
from .enums import SourceType, Confidence

@dataclass(frozen=True)
class SelectorDefinition:
    """
    A structured definition for a single selector, including its source,
    confidence, and any specific attributes to target.
    """
    css: str
    source_type: SourceType
    confidence: Confidence
    attribute: Optional[str] = None

@dataclass(frozen=True)
class ExtractionResult:
    """
    The immutable result of an extraction attempt.
    """
    value: Optional[Any]
    selector_used: Optional[str]
    source_type: Optional[SourceType]
    confidence: Confidence
