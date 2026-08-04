from typing import Optional

def normalize_status(status: Optional[str]) -> str:
    """
    Normalizes a raw status string from a provider into a canonical status.
    """
    if not status:
        return "UNKNOWN"

    status_lower = status.lower()

    if status_lower in ["completed", "complete", "finished", "ended"]:
        return "COMPLETED"

    if status_lower in ["ongoing", "updating", "serializing", "on-going"]:
        return "ONGOING"

    if status_lower in ["hiatus", "on hold", "paused"]:
        return "HIATUS"

    return "UNKNOWN"
