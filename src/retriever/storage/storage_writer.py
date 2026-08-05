from abc import ABC, abstractmethod
from typing import List, Optional

from src.retriever.models.novel_metadata import NovelMetadata
from src.retriever.models.chapter import Chapter
from src.retriever.models.source import Source
from src.retriever.download.request import DownloadRequest

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
    def save_checkpoint(self, novel_id: str, last_successful_order: int, total: int) -> None:
        """
        Saves the download progress.
        """
        pass

    @abstractmethod
    def load_checkpoint(self, novel_id: str) -> Optional[dict]:
        """
        Loads the download progress from the last checkpoint.
        """
        pass

    @abstractmethod
    def finish(self, novel_id: str) -> None:
        """
        Finalizes the storage process.
        """
        pass

    @abstractmethod
    def abort(self, novel_id: str) -> None:
        """
        Aborts the download and cleans up any partial data.
        """
        pass

    @abstractmethod
    def exists(self, novel_id: str) -> bool:
        """
        Checks if a novel already exists in the storage.
        """
        pass

    @abstractmethod
    def delete(self, novel_id: str) -> None:
        """
        Deletes a novel from the storage.
        """
        pass
