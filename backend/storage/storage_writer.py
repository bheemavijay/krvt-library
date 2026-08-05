from abc import ABC, abstractmethod
from typing import List, Optional

from backend.retriever.models.novel_metadata import NovelMetadata
from backend.retriever.models.chapter import Chapter
from backend.retriever.models.source import Source

class StorageWriter(ABC):
    """
    Abstract interface for writing novel data to a storage backend.
    """

    @abstractmethod
    def begin(self, novel_id: str, metadata: NovelMetadata, source: Source) -> None:
        """
        Initializes the storage for a new novel.
        This is called once at the beginning of a download.

        Args:
            novel_id: The unique identifier for the novel, resolved externally.
            metadata: The novel's metadata.
            source: The novel's source information.
        """
        pass

    @abstractmethod
    def append_batch(self, novel_id: str, chapters: List[Chapter]) -> None:
        """
        Appends a batch of chapters to the storage.

        Args:
            novel_id: The unique identifier for the novel.
            chapters: A list of chapter objects to save.
        """
        pass

    @abstractmethod
    def save_checkpoint(self, novel_id: str, completed: int, total: int) -> None:
        """
        Saves the download progress.

        Args:
            novel_id: The unique identifier for the novel.
            completed: The number of chapters successfully downloaded.
            total: The total number of chapters for the novel.
        """
        pass

    @abstractmethod
    def load_checkpoint(self, novel_id: str) -> Optional[dict]:
        """
        Loads the download progress from the last checkpoint.

        Args:
            novel_id: The unique identifier for the novel.

        Returns:
            A dictionary containing checkpoint data, or None if no checkpoint exists.
        """
        pass

    @abstractmethod
    def finish(self, novel_id: str) -> None:
        """
        Finalizes the storage process.
        This is called once all chapters have been downloaded.

        Args:
            novel_id: The unique identifier for the novel.
        """
        pass

    @abstractmethod
    def abort(self, novel_id: str) -> None:
        """
        Aborts the download and cleans up any partial data.

        Args:
            novel_id: The unique identifier for the novel.
        """
        pass

    @abstractmethod
    def exists(self, novel_id: str) -> bool:
        """
        Checks if a novel already exists in the storage.

        Args:
            novel_id: The unique identifier for the novel.

        Returns:
            True if the novel exists, False otherwise.
        """
        pass

    @abstractmethod
    def delete(self, novel_id: str) -> None:
        """
        Deletes a novel from the storage.

        Args:
            novel_id: The unique identifier for the novel.
        """
        pass
