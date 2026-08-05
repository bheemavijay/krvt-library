from abc import ABC, abstractmethod
from .request import DownloadRequest
from .result import DownloadResult

class DownloadEngine(ABC):
    """
    Abstract interface for the download orchestration engine.

    The engine is responsible for coordinating the entire download process,
    from provider resolution to storage, without handling the specifics
    of any single step. Its public API consists of a single `download` method.
    """

    @abstractmethod
    def download(self, request: DownloadRequest) -> DownloadResult:
        """
        Orchestrates the download of a novel based on the provided request.

        Args:
            request: A DownloadRequest object containing all parameters for the operation.

        Returns:
            A DownloadResult object summarizing the outcome.
        """
        pass
