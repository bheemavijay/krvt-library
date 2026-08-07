from dataclasses import dataclass

@dataclass(frozen=True)
class MetricsSnapshot:
    """
    An immutable snapshot of download metrics at a point in time.
    """
    elapsed_time_seconds: float
    chapters_downloaded: int
    chapters_failed: int
    retries: int
    assets_downloaded: int
    assets_failed: int
    average_chapter_latency_ms: float
    chapters_per_second: float
    average_worker_utilization_percent: float
