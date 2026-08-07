from abc import ABC, abstractmethod
from typing import List
from src.retriever.download.result import DownloadStatus
from src.retriever.assets.asset_type import AssetType
from src.retriever.retry.context import RetryContext

class DownloadObserver(ABC):
    """
    Abstract interface for observing download lifecycle events.
    """

    @abstractmethod
    def download_started(self, url: str):
        pass

    @abstractmethod
    def download_paused(self):
        pass

    @abstractmethod
    def download_resumed(self):
        pass

    @abstractmethod
    def download_cancelled(self):
        pass

    @abstractmethod
    def metadata_loaded(self, title: str, provider: str):
        pass

    @abstractmethod
    def chapters_found(self, total_chapters: int, chapters_to_download: int):
        pass

    @abstractmethod
    def resumed(self, skipped_count: int, remaining_count: int):
        pass

    @abstractmethod
    def chapter_started(self, order: int, total: int, title: str):
        pass

    @abstractmethod
    def chapter_completed(self, order: int, title: str):
        pass

    @abstractmethod
    def chapter_failed(self, order: int, title: str, error_message: str):
        pass

    @abstractmethod
    def batch_written(self, batch_size: int):
        pass

    @abstractmethod
    def checkpoint_saved(self, last_successful_order: int):
        pass

    @abstractmethod
    def asset_started(self, asset_type: AssetType):
        pass

    @abstractmethod
    def asset_completed(self, asset_type: AssetType, filename: str):
        pass

    @abstractmethod
    def asset_failed(self, asset_type: AssetType, error_message: str):
        pass

    @abstractmethod
    def retry_started(self, context: RetryContext):
        pass

    @abstractmethod
    def retry_attempt(self, context: RetryContext):
        pass

    @abstractmethod
    def retry_waiting(self, context: RetryContext, delay_seconds: float):
        pass

    @abstractmethod
    def retry_succeeded(self, context: RetryContext):
        pass

    @abstractmethod
    def retry_exhausted(self, context: RetryContext):
        pass

    @abstractmethod
    def download_finished(self, status: DownloadStatus, downloaded: int, skipped: int, failed: int, duration_ms: int, errors: List[str]):
        pass
