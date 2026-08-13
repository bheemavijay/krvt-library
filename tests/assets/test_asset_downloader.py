import pytest
import httpx
from unittest.mock import MagicMock, AsyncMock

from src.retriever.assets.downloader import AssetDownloader
from src.retriever.assets.asset import Asset
from src.retriever.assets.asset_type import AssetType
from src.retriever.assets.options import AssetDownloadOptions
from src.retriever.storage.storage_writer import StorageWriter
from src.retriever.observers.observer import DownloadObserver
from src.retriever.retry.executor import RetryExecutor
from src.retriever.runtime.context import RuntimeContext

@pytest.fixture
def mock_deps():
    storage = MagicMock(spec=StorageWriter)
    storage.save_asset = MagicMock(return_value="assets/cover.jpg")

    observer = MagicMock(spec=DownloadObserver)
    observer.asset_started = MagicMock()
    observer.asset_completed = MagicMock()
    observer.asset_failed = MagicMock()

    retry_executor = MagicMock(spec=RetryExecutor)
    # Make the retry executor just run the function once
    retry_executor.execute = AsyncMock(side_effect=lambda func, **kwargs: func())

    return storage, observer, retry_executor

@pytest.mark.asyncio
async def test_download_asset_success(mock_deps, respx_mock):
    storage, observer, retry_executor = mock_deps

    asset = Asset(type=AssetType.COVER, url="http://example.com/cover.jpg")
    respx_mock.get("http://example.com/cover.jpg").mock(return_value=httpx.Response(200, content=b"image data"))

    downloader = AssetDownloader(storage, observer, retry_executor)
    options = AssetDownloadOptions(enabled=True, download_cover=True)
    runtime = RuntimeContext()

    result = await downloader.download("novel-1", [asset], options, runtime)

    assert result.downloaded == 1
    assert result.skipped == 0
    assert result.failed == 0

    observer.asset_started.assert_called_once_with(AssetType.COVER)
    storage.save_asset.assert_called_once()
    observer.asset_completed.assert_called_once()

@pytest.mark.asyncio
async def test_download_asset_filtered(mock_deps):
    storage, observer, retry_executor = mock_deps

    assets = [
        Asset(type=AssetType.COVER, url="http://example.com/cover.jpg"),
        Asset(type=AssetType.BANNER, url="http://example.com/banner.png")
    ]

    downloader = AssetDownloader(storage, observer, retry_executor)
    options = AssetDownloadOptions(enabled=True, download_cover=True, download_banner=False) # Only download cover
    runtime = RuntimeContext()

    result = await downloader.download("novel-1", assets, options, runtime)

    assert result.downloaded == 0 # No mock response, so it will fail if it tries
    assert result.skipped == 1
    assert result.failed == 1 # The cover download is attempted and fails

@pytest.mark.asyncio
async def test_download_asset_failure(mock_deps, respx_mock):
    storage, observer, retry_executor = mock_deps

    asset = Asset(type=AssetType.COVER, url="http://example.com/cover.jpg")
    respx_mock.get("http://example.com/cover.jpg").mock(return_value=httpx.Response(500))

    downloader = AssetDownloader(storage, observer, retry_executor)
    options = AssetDownloadOptions(enabled=True, download_cover=True)
    runtime = RuntimeContext()

    result = await downloader.download("novel-1", [asset], options, runtime)

    assert result.downloaded == 0
    assert result.skipped == 0
    assert result.failed == 1

    observer.asset_failed.assert_called_once()
    storage.save_asset.assert_not_called()

@pytest.mark.asyncio
async def test_download_disabled(mock_deps):
    storage, observer, retry_executor = mock_deps

    asset = Asset(type=AssetType.COVER, url="http://example.com/cover.jpg")

    downloader = AssetDownloader(storage, observer, retry_executor)
    options = AssetDownloadOptions(enabled=False) # Downloads disabled
    runtime = RuntimeContext()

    result = await downloader.download("novel-1", [asset], options, runtime)

    assert result.downloaded == 0
    assert result.skipped == 1
    assert result.failed == 0

    observer.asset_started.assert_not_called()
