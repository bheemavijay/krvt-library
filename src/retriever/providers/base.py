from abc import ABC, abstractmethod
from ..models.provider import ProviderResult

class BaseProvider(ABC):
    @abstractmethod
    def get_novel(self, url: str) -> ProviderResult:
        pass
