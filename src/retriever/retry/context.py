from dataclasses import dataclass
from typing import Optional
from .failure_type import FailureType

@dataclass(frozen=True)
class RetryContext:
    """
    Represents the state of a retry operation at a given point in time.
    This is an immutable snapshot.
    """
    operation_name: str
    attempt: int
    elapsed_ms: int
    last_exception: Optional[Exception] = None
    failure_type: Optional[FailureType] = None
