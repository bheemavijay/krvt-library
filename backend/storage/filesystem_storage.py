import os
import json
import re
from typing import List, Dict, Any, Optional

from .storage_writer import StorageWriter
from .checkpoint import CheckpointManager

def slugify(text: str) -> str:
    """
    Converts a string into a URL-friendly slug.
    """
    text = text.lower()
    text = re.sub(r'[\s\W]+', '-', text)
    return text.strip('-')

class FilesystemStorage(StorageWriter):
    """
    Implements the StorageWriter interface for a local filesystem.
    """

    def __init__(self, base_dir: str = 'novels'):
        self.base_dir = base_dir
        self.novel_path: Optional[str] = None
        self.chapters_path: Optional[str] = None
        self.assets_path: Optional[str] = None
        self.checkpoint_manager: Optional[CheckpointManager] = None

    def begin(self, metadata: Dict[str, Any]) -> None:
        """
        Initializes the directory structure and saves the initial metadata.
        """
        provider = metadata.get('provider', 'unknown')
        title = metadata.get('title', 'untitled')
        slug = slugify(title)

        self.novel_path = os.path.join(self.base_dir, f"{provider}_{slug}")

        self.chapters_path = os.path.join(self.novel_path, 'chapters')
        self.assets_path = os.path.join(self.novel_path, 'assets')
        os.makedirs(self.chapters_path, exist_ok=True)
        os.makedirs(self.assets_path, exist_ok=True)

        checkpoint_file = os.path.join(self.novel_path, 'checkpoint.json')
        self.checkpoint_manager = CheckpointManager(checkpoint_file)

        novel_metadata_path = os.path.join(self.novel_path, 'novel.json')
        with open(novel_metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2)

    def append_batch(self, chapters: List[Dict[str, Any]]) -> None:
        """
        Saves a batch of chapters to individual JSON files.
        """
        if not self.chapters_path:
            raise RuntimeError("Storage not initialized. Call begin() first.")

        for chapter in chapters:
            order = chapter.get('order')
            if order is None:
                continue

            chapter_filename = f"{order:04d}.json"
            chapter_path = os.path.join(self.chapters_path, chapter_filename)

            with open(chapter_path, 'w', encoding='utf-8') as f:
                json.dump(chapter, f, indent=2)

    def save_checkpoint(self, chapter_index: int) -> None:
        """
        Saves the current download progress.
        """
        if not self.checkpoint_manager:
            raise RuntimeError("Storage not initialized. Call begin() first.")

        checkpoint_data = {
            "last_successful_chapter": chapter_index,
            "status": "running"
        }
        self.checkpoint_manager.save(checkpoint_data)

    def load_checkpoint(self) -> Optional[Dict[str, Any]]:
        """
        Loads the last saved checkpoint.
        """
        if not self.checkpoint_manager:
            # This requires the checkpoint manager to be initialized in begin() first.
            # In a real scenario, the downloader would determine the path first.
            return None

        return self.checkpoint_manager.load()

    def finish(self) -> None:
        """
        Finalizes the download, updating the checkpoint status.
        """
        if not self.checkpoint_manager:
            raise RuntimeError("Storage not initialized. Call begin() first.")

        checkpoint_data = self.checkpoint_manager.load() or {}
        checkpoint_data['status'] = 'completed'
        self.checkpoint_manager.save(checkpoint_data)
