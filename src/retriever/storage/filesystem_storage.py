import os
import json
import shutil
from typing import List, Optional, Dict, Any
from dataclasses import asdict
from datetime import datetime

from src.retriever.models.novel_metadata import NovelMetadata
from src.retriever.models.chapter import Chapter
from src.retriever.models.source import Source
from src.retriever.download.request import DownloadRequest
from src.retriever.download.result import DownloadStatus
from .storage_writer import StorageWriter

class FilesystemStorage(StorageWriter):
    def __init__(self, base_dir: str = 'novels'):
        self.base_dir = base_dir
        self._novel_info_cache = {} # Cache to hold info like provider, title, etc.

    def _get_novel_paths(self, novel_id: str) -> Dict[str, str]:
        novel_root = os.path.join(self.base_dir, novel_id)
        return {
            "root": novel_root,
            "metadata": os.path.join(novel_root, 'metadata.json'),
            "source": os.path.join(novel_root, 'source.json'),
            "chapters_dir": os.path.join(novel_root, 'chapters'),
            "assets_dir": os.path.join(novel_root, 'assets'),
            "checkpoint": os.path.join(novel_root, 'checkpoint.json'),
            "manifest": os.path.join(novel_root, 'manifest.json'),
        }

    def _update_manifest(self, novel_id: str, status: DownloadStatus, **kwargs):
        paths = self._get_novel_paths(novel_id)
        now = datetime.utcnow().isoformat()

        manifest_data = {}
        if os.path.exists(paths["manifest"]):
            with open(paths["manifest"], 'r', encoding='utf-8') as f:
                manifest_data = json.load(f)

        # Preserve createdAt
        if "createdAt" not in manifest_data:
            manifest_data["createdAt"] = now

        manifest_data.update({
            "schemaVersion": 1,
            "status": status.value,
            "novelId": novel_id,
            "updatedAt": now,
            "assets": manifest_data.get("assets", {}),
        })

        # Update with any new info passed in kwargs
        manifest_data.update(kwargs)

        if status == DownloadStatus.COMPLETED:
            manifest_data["completedAt"] = now

        with open(paths["manifest"], 'w', encoding='utf-8') as f:
            json.dump(manifest_data, f, indent=2)

    def begin(self, novel_id: str, request: DownloadRequest, metadata: NovelMetadata, source: Source) -> None:
        paths = self._get_novel_paths(novel_id)
        os.makedirs(paths["chapters_dir"], exist_ok=True)
        os.makedirs(paths["assets_dir"], exist_ok=True)

        with open(paths["metadata"], 'w', encoding='utf-8') as f:
            json.dump(asdict(metadata), f, indent=2)

        with open(paths["source"], 'w', encoding='utf-8') as f:
            json.dump(asdict(source), f, indent=2)

        # Cache info for later manifest updates
        self._novel_info_cache[novel_id] = {
            "provider": source.provider_id,
            "providerVersion": source.version,
            "navigationMode": "CLOUDFLARE", # Placeholder, should come from provider
            "title": metadata.title
        }

        self._update_manifest(novel_id, DownloadStatus.RUNNING, **self._novel_info_cache[novel_id])

    def append_batch(self, novel_id: str, chapters: List[Chapter]) -> None:
        paths = self._get_novel_paths(novel_id)
        for chapter in chapters:
            chapter_filename = f"{chapter.order:06d}.json"
            chapter_path = os.path.join(paths["chapters_dir"], chapter_filename)
            with open(chapter_path, 'w', encoding='utf-8') as f:
                json.dump(asdict(chapter), f, indent=2)

    def save_checkpoint(self, novel_id: str, last_successful_order: int, downloaded_count: int, skipped_count: int, failed_count: int, total_chapters: int) -> None:
        paths = self._get_novel_paths(novel_id)
        checkpoint_data = {
            "last_successful_order": last_successful_order,
            "downloaded": downloaded_count,
            "skipped": skipped_count,
            "failed": failed_count,
            "total": total_chapters
        }
        with open(paths["checkpoint"], 'w', encoding='utf-8') as f:
            json.dump(checkpoint_data, f, indent=2)

        manifest_updates = {
            "downloaded": downloaded_count + skipped_count,
            "total": total_chapters,
        }
        manifest_updates.update(self._novel_info_cache.get(novel_id, {}))
        self._update_manifest(novel_id, DownloadStatus.RUNNING, **manifest_updates)

    def load_checkpoint(self, novel_id: str) -> Optional[Dict[str, Any]]:
        paths = self._get_novel_paths(novel_id)
        if os.path.exists(paths["checkpoint"]):
            with open(paths["checkpoint"], 'r', encoding='utf-8') as f:
                return json.load(f)
        return None

    def load_manifest(self, novel_id: str) -> Optional[Dict[str, Any]]:
        paths = self._get_novel_paths(novel_id)
        if os.path.exists(paths["manifest"]):
            with open(paths["manifest"], 'r', encoding='utf-8') as f:
                return json.load(f)
        return None

    def finish(self, novel_id: str, status: DownloadStatus) -> None:
        checkpoint = self.load_checkpoint(novel_id)
        manifest_updates = self._novel_info_cache.get(novel_id, {})
        if checkpoint:
            manifest_updates.update({
                "downloaded": checkpoint.get("downloaded", 0) + checkpoint.get("skipped", 0),
                "total": checkpoint.get("total", 0)
            })
        self._update_manifest(novel_id, status, **manifest_updates)
        # We keep the checkpoint file for history/debugging

    def abort(self, novel_id: str) -> None:
        self._update_manifest(novel_id, DownloadStatus.CANCELLED)

    def exists(self, novel_id: str) -> bool:
        paths = self._get_novel_paths(novel_id)
        return os.path.exists(paths["manifest"])

    def delete(self, novel_id: str) -> None:
        paths = self._get_novel_paths(novel_id)
        shutil.rmtree(paths["root"], ignore_errors=True)
