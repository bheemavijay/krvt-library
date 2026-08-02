from abc import ABC, abstractmethod
from ..models.page import RawBrowserResponse

class BrowserDriver(ABC):
    @abstractmethod
    def launch(self):
        pass

    @abstractmethod
    def get(self, url: str) -> RawBrowserResponse:
        pass

    @abstractmethod
    def close(self):
        pass
