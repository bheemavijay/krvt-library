from abc import ABC, abstractmethod
from ..core.document import Document
from ..models.enums import NavigationMode

class BrowserDriver(ABC):
    @abstractmethod
    def launch(self):
        pass

    @abstractmethod
    def get(self, url: str, navigation_mode: NavigationMode) -> Document:
        pass

    @abstractmethod
    def close(self):
        pass
