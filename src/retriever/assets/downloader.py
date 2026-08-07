import httpx
from typing import List, Optional

from src.retriever.storage.storage_writer import StorageWriter
from src.retriever.observers.observer import DownloadObserver
from src.retriever.retry.executor import RetryExecutor
from src.retriever.runtime.context import RuntimeContext
from .asset import Asset
from .result import AssetDownloadResult
from .asset_type import AssetType
from .options import AssetDownloadOptions

class AssetDownloader:
    def __init__(
        self,
        storage: StorageWriter,
        observer: DownloadObserver,
        retry_executor: RetryExecutor,
    ):
        self.storage = storage
        self.observer = observer
        self.retry_executor = retry_executor

    async def download(
        self,
        novel_id: str,
        assets: List[Asset],
        options: AssetDownloadOptions,
        runtime: RuntimeContext,
    ) -> AssetDownloadResult:

        if not options.enabled:
            return AssetDownloadResult(downloaded=0, skipped=len(assets), failed=0, assets=assets)

        downloaded_count = 0
        skipped_count = 0
        failed_count = 0

        assets_to_download = self._filter_assets(assets, options)
        skipped_count = len(assets) - len(assets_to_download)

        for asset in assets_to_download:
            runtime.cancellation.throw_if_cancelled()
            await runtime.pause.wait_if_paused()

            self.observer.asset_started(asset.type)
            try:
                async def download_action():
                    async with httpx.AsyncClient() as client:
                        # TODO: Add timeout to client request
                        response = await client.get(asset.url)
                        response.raise_for_status()
                        return response

                response = await self.retry_executor.execute(
                    func=download_action,
                    operation_name=f"Download asset {asset.type.value}",
                    runtime=runtime
                )

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
        return filtered_assets
