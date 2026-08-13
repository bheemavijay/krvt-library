from dataclasses import dataclass

@dataclass(frozen=True)
class DownloadRequest:
    url: str
