import pytest
import asyncio
from pathlib import Path

from tests.fixtures.mock_provider import MockProvider
from tests.fixtures.fake_browser import FakeBrowserContext
from tests.storage.temp_storage import TempFilesystemStorage

from src.retriever.providers.registry import ProviderRegistry

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop()
    yield loop
    loop.close()

@pytest.fixture
def mock_provider_factory():
    def _factory(metadata: dict, chapters: list):
        return MockProvider(metadata, chapters)
    return _factory

@pytest.fixture
def fake_browser_context_factory():
    def _factory(documents: dict):
        return FakeBrowserContext(documents)
    return _factory

@pytest.fixture
def temp_storage():
    with TempFilesystemStorage() as storage:
        yield storage

@pytest.fixture(scope="session")
def initialized_provider_registry():
    registry = ProviderRegistry()
    registry.discover()
    registry.validate()
    registry.initialize()
    registry.freeze()
    return registry