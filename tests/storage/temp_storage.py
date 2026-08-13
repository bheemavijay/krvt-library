import tempfile
import shutil
from pathlib import Path

class TempFilesystemStorage:
    def __init__(self):
        self._temp_dir = tempfile.TemporaryDirectory()
        self.root_path = Path(self._temp_dir.name)

    def cleanup(self):
        self._temp_dir.cleanup()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.cleanup()
