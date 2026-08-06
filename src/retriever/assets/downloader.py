import httpx
from typing import List

from src.retriever.storage.storage_writer import StorageWriter
from src.retriever.observers.observer import DownloadObserver
from src.retriever.core.context import BrowserContext
from .asset import Asset
from .result import AssetDownloadResult
from .asset_type import AssetType
from .options import AssetDownloadOptions

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
        assets: List[Asset],
        options: AssetDownloadOptions
    ) -> AssetDownloadResult:

        if not options.enabled:
            return AssetDownloadResult(downloaded=0, skipped=len(assets), failed=0, assets=assets)

        downloaded_count = 0
        skipped_count = 0
        failed_count = 0

        assets_to_download = self._filter_assets(assets, options)
        skipped_count = len(assets) - len(assets_to_download)

        for asset in assets_to_download:
            self.observer.asset_started(asset.type)
            try:
                # TODO: Add resume/skip logic for assets based on manifest

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
                self.observer.asset_completed(asset.type, relative_path)

            except httpx.HTTPStatusError as e:
                failed_count += 1
                self.observer.asset_failed(asset.type, str(e))
            except Exception as e:
                failed_count += 1
                self.observer.asset_failed(asset.type, str(e))
                continue

        return AssetDownloadResult(
            downloaded=downloaded_count,
            skipped=skipped_count,
            failed=failed_count,
            assets=assets_to_download
        )

    def _filter_assets(self, assets: List[Asset], options: AssetDownloadOptions) -> List[Asset]:
        filtered_assets = []
        for asset in assets:
            if asset.type == AssetType.COVER and options.download_cover:
                filtered_assets.append(asset)
            elif asset.type == AssetType.BANNER and options.download_banner:
                filtered_assets.append(asset)
            # Add other asset types here
        return filtered_assets
