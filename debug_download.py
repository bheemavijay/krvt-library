import asyncio
from src.retriever.config.settings import Settings
from src.retriever.core.context import BrowserContext
from src.retriever.profiles.manager import ProfileManager
from src.retriever.providers.manager import ProviderManager
from src.retriever.download.downloader import DownloadEngine
from src.retriever.storage.filesystem_storage import FilesystemStorage
from src.retriever.assets.downloader import AssetDownloader
from src.retriever.download.request import DownloadRequest
from src.retriever.retry.executor import RetryExecutor
from src.retriever.observers.console_observer import ConsoleDownloadObserver
from src.retriever.worker.worker_pool import WorkerPool
from src.retriever.worker.ordered_buffer import OrderedBuffer
from src.retriever.metrics.collector import MetricsCollector
from src.retriever.rate_limit.token_bucket import TokenBucketLimiter
from src.retriever.runtime.services import RuntimeServices
import json
from dataclasses import asdict

async def main():
    # --- Configuration ---
    novel_url = "https://www.fanmtl.com/novel/sign-in-the-man-is-on-an-isolated-island-and-he-has-just-built-a-luxury-villa-by-himself.html"

    request = DownloadRequest(
        url=novel_url,
        chapter_limit=10,
        download_assets=True,
        download_cover=True,
        download_banner=False,
        overwrite=False,
        resume=True
    )

    # --- Resolve Provider ---
    try:
        provider = ProviderManager.resolve(request.url)
    except ValueError as e:
        print(e)
        return

    # --- Setup ---
    profile_manager = ProfileManager(root_dir="profiles")
    profile_path = profile_manager.get_profile_path(f"{provider.id}_profile")
    is_headless = "readnovelmtl" not in provider.id
    settings = Settings(profile_path=profile_path, headless=is_headless)

    context = BrowserContext(settings)
    storage = FilesystemStorage(base_dir="novels")

    # --- Runtime Services ---
    observer = ConsoleDownloadObserver()
    retry_executor = RetryExecutor(observer=observer)
    rate_limiter = TokenBucketLimiter()
    metrics_collector = MetricsCollector()

    runtime_services = RuntimeServices(
        retry_executor=retry_executor,
        rate_limiter=rate_limiter,
        metrics=metrics_collector,
        observer=observer
    )

    # --- Other Components ---
    asset_downloader = AssetDownloader(storage, observer, retry_executor)
    worker_pool = WorkerPool(provider=provider, browser_context=context)
    ordering_buffer = OrderedBuffer()

    engine = DownloadEngine(context, storage, asset_downloader, worker_pool, ordering_buffer, runtime_services)

    # --- Execution ---
    try:
        context.start()
        result = await engine.download(request)

        # --- Summary ---
        print("\n--- Final Result ---")
        print(json.dumps(asdict(result), indent=2))
        print("\n--- Metrics ---")
        print(json.dumps(metrics_collector.snapshot().__dict__, indent=2))

    finally:
        print("\nClosing browser context...")
        context.close()


if __name__ == "__main__":
    asyncio.run(main())
