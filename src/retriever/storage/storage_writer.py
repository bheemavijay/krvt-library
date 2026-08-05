from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any

from src.retriever.models.novel_metadata import NovelMetadata
from src.retriever.models.chapter import Chapter
from src.retriever.models.source import Source
from src.retriever.download.request import DownloadRequest
from src.retriever.download.result import DownloadStatus

class StorageWriter(ABC):
    """
    Abstract interface for writing novel data to a storage backend.
    """

    @abstractmethod
    def begin(self, novel_id: str, request: DownloadRequest, metadata: NovelMetadata, source: Source) -> None:
        """
        Initializes the storage for a new novel.

        NOTE: This signature is considered frozen. Do not change it without
        a major architectural review.
        """
        pass

    @abstractmethod
    def append_batch(self, novel_id: str, chapters: List[Chapter]) -> None:
        """
        Appends a batch of chapters to the storage.
        """
        pass

    @abstractmethod
    def save_checkpoint(self, novel_id: str, last_successful_order: int, downloaded_count: int, skipped_count: int, failed_count: int, total_chapters: int) -> None:
        """
        Saves the download progress to a checkpoint and updates the manifest.
        """
        pass

    @abstractmethod
    def load_checkpoint(self, novel_id: str) -> Optional[Dict[str, Any]]:
        """
        Loads the download progress from the last checkpoint.
        """
        pass

    @abstractmethod
    def load_manifest(self, novel_id: str) -> Optional[Dict[str, Any]]:
        """
        Loads the manifest data from a file.
        """
        pass

    @abstractmethod
    def finish(self, novel_id: str, status: DownloadStatus) -> None:
        """
        Finalizes the storage process, writing the final manifest status.
        """
        pass

    @abstractmethod
    def abort(self, novel_id: str) -> None:
        """
        Aborts the download and marks it as CANCELLED in the manifest.
        """
        pass

    @abstractmethod
    def exists(self, novel_id: str) -> bool:
        """
        Checks if a novel already exists in the storage by looking for the manifest.
        """
        pass

    @abstractmethod
    def delete(self, novel_id: str) -> None:
        """
        Deletes a novel from the storage.
        """
        pass
