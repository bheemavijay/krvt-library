from typing import List
from .observer import DownloadObserver
from src.retriever.download.result import DownloadStatus
from src.retriever.assets.asset_type import AssetType

class NullDownloadObserver(DownloadObserver):
    """
    A DownloadObserver that does nothing, effectively silencing all progress output.
    """

    def download_started(self, url: str):
        pass

    def metadata_loaded(self, title: str, provider: str):
        pass

    def chapters_found(self, total_chapters: int, chapters_to_download: int):
        pass

    def resumed(self, skipped_count: int, remaining_count: int):
        pass

    def chapter_started(self, order: int, total: int, title: str):
        pass

    def chapter_completed(self, order: int, title: str):
        pass

    def chapter_failed(self, order: int, title: str, error_message: str):
        pass

    def batch_written(self, batch_size: int):
        pass

    def checkpoint_saved(self, last_successful_order: int):
        pass

    def asset_started(self, asset_type: AssetType):
        pass

    def asset_completed(self, asset_type: AssetType, filename: str):
        pass

    def asset_failed(self, asset_type: AssetType, error_message: str):
        pass

    def download_finished(self, status: DownloadStatus, downloaded: int, skipped: int, failed: int, duration_ms: int, errors: List[str]):
        pass
