from typing import List
from .observer import DownloadObserver
from src.retriever.download.result import DownloadStatus
from src.retriever.assets.asset_type import AssetType
from src.retriever.retry.context import RetryContext

class ConsoleDownloadObserver(DownloadObserver):
    """
    An observer that prints download lifecycle events to the console.
    """

    def download_started(self, url: str):
        print(f"--- Starting Download for: {url} ---")

    def download_paused(self):
        print("--- Download Paused ---")

    def download_resumed(self):
        print("--- Download Resumed ---")

    def download_cancelled(self):
        print("--- Download Cancelled by user ---")

    def metadata_loaded(self, title: str, provider: str):
        print(f"[Phase 1] Fetched metadata for '{title}' from provider '{provider}'.")

    def chapters_found(self, total_chapters: int, chapters_to_download: int):
        print(f"Found {total_chapters} total chapters. Downloading {chapters_to_download} new chapters.")

    def resumed(self, skipped_count: int, remaining_count: int):
        print(f"Resuming download, skipping {skipped_count} chapters. {remaining_count} chapters remaining.")

    def chapter_started(self, order: int, total: int, title: str):
        print(f"[{order}/{total}] Downloading: {title}")

    def chapter_completed(self, order: int, title: str):
        pass

    def chapter_failed(self, order: int, title: str, error_message: str):
        print(f"  - FAILED to download chapter {order} ({title}): {error_message}")

    def batch_written(self, batch_size: int):
        print(f"  -> Writing batch of {batch_size} chapters...")

    def checkpoint_saved(self, last_successful_order: int):
        print(f"  -> Checkpoint saved at chapter {last_successful_order}.")

    def asset_started(self, asset_type: AssetType):
        print(f"Downloading asset: {asset_type.value}...")

    def asset_completed(self, asset_type: AssetType, filename: str):
        print(f"Asset '{asset_type.value}' downloaded as '{filename}'.")

    def asset_failed(self, asset_type: AssetType, error_message: str):
        print(f"  - FAILED to download asset '{asset_type.value}': {error_message}")

    def retry_started(self, context: RetryContext):
        print(f"Starting retriable operation: {context.operation_name}")

    def retry_attempt(self, context: RetryContext):
        print(f"  - Attempt {context.attempt} for '{context.operation_name}' failed: {context.last_exception}")

    def retry_waiting(self, context: RetryContext, delay_seconds: float):
        print(f"  - Waiting {delay_seconds:.2f} seconds before next attempt...")

    def retry_succeeded(self, context: RetryContext):
        print(f"  - Operation '{context.operation_name}' succeeded after {context.attempt} attempts.")

    def retry_exhausted(self, context: RetryContext):
        print(f"  - Retries exhausted for '{context.operation_name}'. Final error: {context.last_exception}")

    def download_finished(self, status: DownloadStatus, downloaded: int, skipped: int, failed: int, duration_ms: int, errors: List[str]):
        print("\n--- Download Finished ---")
        print(f"Status: {status.value}")
        print(f"Downloaded: {downloaded} chapters")
        print(f"Skipped: {skipped} chapters")
        print(f"Failed: {failed} chapters")
        print(f"Duration: {duration_ms / 1000:.2f} seconds")
        if errors:
            print("Errors encountered:")
            for error in errors:
                print(f"  - {error}")
