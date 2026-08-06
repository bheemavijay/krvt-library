import httpx
from typing import List, Optional

from src.retriever.providers.base import BaseProvider
from src.retriever.models.novel_metadata import NovelMetadata
from src.retriever.download.request import DownloadRequest
from src.retriever.storage.storage_writer import StorageWriter
from src.retriever.observers.observer import DownloadObserver
from src.retriever.core.context import BrowserContext
from src.retriever.exceptions.exceptions import NavigationException
from .asset import Asset
from .result import AssetDownloadResult
from .asset_type import AssetType

class AssetDownloader:
    """
    Responsible for downloading assets associated with a novel.
    """
    def __init__(
        self,
        storage: StorageWriter,
        observer: DownloadObserver,
        browser_context: BrowserContext,
    ):
        self.storage = storage
        self.observer = observer
        self.browser_context = browser_context

    async def download(
        self,
        novel_id: str,
        provider: BaseProvider,
        metadata: NovelMetadata,
        request: DownloadRequest
    ) -> AssetDownloadResult:

        downloaded_count = 0
        skipped_count = 0
        failed_count = 0

        assets_to_process: List[Asset] = provider.get_assets(metadata)

        for asset in assets_to_process:
            self.observer.asset_started(asset.original_filename or asset.url)
            try:
                # TODO: Add resume/skip logic for assets based on manifest

                # Reuse BrowserContext for downloading assets
                # Assuming asset URLs don't require specific navigation modes for now
                response_doc = self.browser_context.get(asset.url, provider.navigation_mode)

                # The actual content is in response_doc.html (string) or response_doc.soup
                # For binary assets, we need the raw bytes. This implies BrowserContext.get
                # might need to return raw bytes for certain content types, or we use httpx directly here.
                # For now, let's assume BrowserContext can give us raw bytes for assets.
                # This is a simplification for the current phase.

                # For now, we'll use httpx directly for binary content, as BrowserContext returns Document (HTML)
                # This is a temporary deviation until BrowserContext is enhanced for binary assets.
                async with httpx.AsyncClient() as client:
                    response = await client.get(asset.url)
                    response.raise_for_status()
                    content = response.content
                    mime_type = response.headers.get("content-type")

                relative_path = self.storage.save_asset(
                    novel_id,
                    asset.type,
                    asset.url,
                    asset.original_filename,
                    content,
                    mime_type
                )
                downloaded_count += 1
                self.observer.asset_completed(asset.original_filename or asset.url)

            except NavigationException as e:
                failed_count += 1
                self.observer.asset_failed(asset.original_filename or asset.url, str(e))
            except httpx.HTTPStatusError as e:
                failed_count += 1
                self.observer.asset_failed(asset.original_filename or asset.url, str(e))
            except Exception as e:
                failed_count += 1
                self.observer.asset_failed(asset.original_filename or asset.url, str(e))
                continue

        return AssetDownloadResult(
            downloaded=downloaded_count,
            skipped=skipped_count,
            failed=failed_count,
            assets=assets_to_process # This list should eventually contain the saved relative paths
        )
