import json
import os
from dataclasses import asdict
from .storage_writer import StorageWriter
from src.retriever.models.provider import Novel

class FilesystemStorage(StorageWriter):
    def __init__(self, output_dir: str = "output"):
        self.output_dir = output_dir
        self.novel_id = ""

    def begin(self, novel_id: str):
        self.novel_id = novel_id
        os.makedirs(os.path.join(self.output_dir, self.novel_id), exist_ok=True)

    def save_batch(self, novel: Novel):
        # In a simple JSON implementation, we might just overwrite on each batch.
        # A more complex system could save batches to separate files.
        self.finish(novel)

    def finish(self, novel: Novel):
        if not self.novel_id:
            raise ValueError("Storage session not started. Call begin() first.")

        output_path = os.path.join(self.output_dir, self.novel_id, "novel.json")
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(asdict(novel), f, ensure_ascii=False, indent=2)
        print(f"Novel data saved to {output_path}")
