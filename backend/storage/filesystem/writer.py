import os
import json
import shutil
from typing import List, Optional, Dict, Any

from backend.retriever.models.novel_metadata import NovelMetadata
from backend.retriever.models.chapter import Chapter
from backend.retriever.models.source import Source
from backend.storage.storage_writer import StorageWriter
from backend.storage.checkpoint import CheckpointManager

class FilesystemStorage(StorageWriter):
    """
    Implements the StorageWriter interface for a local filesystem.
    """

    def __init__(self, base_dir: str = 'novels'):
        self.base_dir = base_dir

    def _get_novel_paths(self, novel_id: str) -> Dict[str, str]:
        """Helper to get all relevant paths for a given novel_id."""
        novel_root = os.path.join(self.base_dir, novel_id)
        return {
            "root": novel_root,
            "metadata": os.path.join(novel_root, 'novel.json'),
            "chapters_dir": os.path.join(novel_root, 'chapters'),
            "assets_dir": os.path.join(novel_root, 'assets'),
            "checkpoint": os.path.join(novel_root, 'checkpoint.json'),
        }

    def begin(self, novel_id: str, metadata: NovelMetadata, source: Source) -> None:
        """
        Initializes the directory structure and saves the initial metadata.
        """
        paths = self._get_novel_paths(novel_id)

        os.makedirs(paths["chapters_dir"], exist_ok=True)
        os.makedirs(paths["assets_dir"], exist_ok=True)

        with open(paths["metadata"], 'w', encoding='utf-8') as f:
            json.dump(metadata.__dict__, f, indent=2) # Convert dataclass to dict

    def append_batch(self, novel_id: str, chapters: List[Chapter]) -> None:
        """
        Saves a batch of chapters to individual JSON files.
        """
        paths = self._get_novel_paths(novel_id)
        chapters_dir = paths["chapters_dir"]

        if not os.path.exists(chapters_dir):
            raise RuntimeError(f"Chapters directory for {novel_id} not found. Call begin() first.")

        for chapter in chapters:
            chapter_filename = f"{chapter.order:04d}.json"
            chapter_path = os.path.join(chapters_dir, chapter_filename)

            with open(chapter_path, 'w', encoding='utf-8') as f:
                json.dump(chapter.__dict__, f, indent=2) # Convert dataclass to dict

    def save_checkpoint(self, novel_id: str, completed: int, total: int) -> None:
        """
        Saves the current download progress.
        """
        paths = self._get_novel_paths(novel_id)
        checkpoint_manager = CheckpointManager(paths["checkpoint"])

        provider = novel_id.split('_')[0]
        checkpoint_manager.save(provider=provider, novel_id=novel_id, completed=completed, total=total, status="running")

    def load_checkpoint(self, novel_id: str) -> Optional[Dict[str, Any]]:
        """
        Loads the last saved checkpoint.
        """
        paths = self._get_novel_paths(novel_id)
        checkpoint_manager = CheckpointManager(paths["checkpoint"])
        return checkpoint_manager.load()

    def finish(self, novel_id: str) -> None:
        """
        Finalizes the download, updating the checkpoint status.
        """
        paths = self._get_novel_paths(novel_id)
        checkpoint_manager = CheckpointManager(paths["checkpoint"])

        checkpoint_data = checkpoint_manager.load()
        if checkpoint_data:
            provider = checkpoint_data.get("provider", novel_id.split('_')[0])
            completed = checkpoint_data.get("completed", 0)
            total = checkpoint_data.get("total", 0)
            checkpoint_manager.save(provider=provider, novel_id=novel_id, completed=completed, total=total, status="completed")
        else:
            provider = novel_id.split('_')[0]
            checkpoint_manager.save(provider=provider, novel_id=novel_id, completed=0, total=0, status="completed")

    def abort(self, novel_id: str) -> None:
        """
        Aborts the download and cleans up any partial data.
        """
        paths = self._get_novel_paths(novel_id)
        if os.path.exists(paths["root"]):
            shutil.rmtree(paths["root"])

    def exists(self, novel_id: str) -> bool:
        """
        Checks if a novel already exists in the storage.
        """
        paths = self._get_novel_paths(novel_id)
        return os.path.exists(paths["root"]) and os.path.exists(paths["metadata"])

    def delete(self, novel_id: str) -> None:
        """
        Deletes a novel from the storage.
        """
        paths = self._get_novel_paths(novel_id)
        if os.path.exists(paths["root"]):
            shutil.rmtree(paths["root"])
