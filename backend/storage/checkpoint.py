import json
import os
from typing import Dict, Any, Optional
from datetime import datetime

class CheckpointManager:
    """
    Manages reading and writing the download checkpoint file.
    """

    def __init__(self, checkpoint_path: str):
        self.checkpoint_path = checkpoint_path

    def save(self, provider: str, novel_id: str, completed: int, total: int, status: str) -> None:
        """
        Saves the checkpoint data to a file.
        """
        os.makedirs(os.path.dirname(self.checkpoint_path), exist_ok=True)
        data = {
            "provider": provider,
            "novel_id": novel_id,
            "completed": completed,
            "total": total,
            "status": status,
            "updated_at": datetime.utcnow().isoformat()
        }
        with open(self.checkpoint_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)

    def load(self) -> Optional[Dict[str, Any]]:
        """
        Loads the checkpoint data from a file.

        Returns:
            The checkpoint data if the file exists, otherwise None.
        """
        if os.path.exists(self.checkpoint_path):
            with open(self.checkpoint_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        return None
