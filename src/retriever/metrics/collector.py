import time
import threading
from collections import deque
from typing import Deque
from .snapshot import MetricsSnapshot

class MetricsCollector:
    """
    A thread-safe collector for download metrics.
    """
    def __init__(self):
        self.lock = threading.Lock()
        self.start_time = time.monotonic()

        self.chapters_downloaded = 0
        self.chapters_failed = 0
        self.retries = 0
        self.assets_downloaded = 0
        self.assets_failed = 0

        self.chapter_latencies: Deque[float] = deque(maxlen=100)
        self.worker_utilization: Deque[float] = deque(maxlen=100)

    def chapter_complete(self, latency: float):
        with self.lock:
            self.chapters_downloaded += 1
            self.chapter_latencies.append(latency)

    def chapter_fail(self):
        with self.lock:
            self.chapters_failed += 1

    def retry(self):
        with self.lock:
            self.retries += 1

    def asset_complete(self):
        with self.lock:
            self.assets_downloaded += 1

    def asset_fail(self):
        with self.lock:
            self.assets_failed += 1

    def update_worker_utilization(self, active_workers: int, max_workers: int):
        with self.lock:
            utilization = (active_workers / max_workers) * 100 if max_workers > 0 else 0
            self.worker_utilization.append(utilization)

    def snapshot(self) -> MetricsSnapshot:
        with self.lock:
            elapsed_time = time.monotonic() - self.start_time
            avg_latency = sum(self.chapter_latencies) / len(self.chapter_latencies) if self.chapter_latencies else 0
            chapters_per_sec = self.chapters_downloaded / elapsed_time if elapsed_time > 0 else 0
            avg_utilization = sum(self.worker_utilization) / len(self.worker_utilization) if self.worker_utilization else 0

            return MetricsSnapshot(
                elapsed_time_seconds=elapsed_time,
                chapters_downloaded=self.chapters_downloaded,
                chapters_failed=self.chapters_failed,
                retries=self.retries,
                assets_downloaded=self.assets_downloaded,
                assets_failed=self.assets_failed,
                average_chapter_latency_ms=avg_latency * 1000,
                chapters_per_second=chapters_per_sec,
                average_worker_utilization_percent=avg_utilization,
            )
