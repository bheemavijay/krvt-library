from abc import ABC, abstractmethod
from src.retriever.models.provider import Novel

class StorageWriter(ABC):
    @abstractmethod
    def begin(self, novel_id: str):
        pass

    @abstractmethod
    def save_batch(self, novel: Novel):
        pass

    @abstractmethod
    def finish(self, novel: Novel):
        pass
