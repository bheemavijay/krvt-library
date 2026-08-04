def normalize_status(status: str) -> str:
    if not status:
        return "UNKNOWN"

    status_lower = status.lower()

    if status_lower in ["completed", "complete", "finished", "ended"]:
        return "COMPLETED"

    if status_lower in ["ongoing", "updating", "serializing", "on-going"]:
        return "ONGOING"

    if status_lower in ["hiatus", "on hold"]:
        return "HIATUS"

    return "UNKNOWN"
