import asyncio
from src.retriever.config.settings import Settings
from src.retriever.core.context import BrowserContext
from src.retriever.profiles.manager import ProfileManager
from src.retriever.providers.manager import ProviderManager
from src.retriever.download.downloader import DownloadEngine
from src.retriever.storage.filesystem_storage import FilesystemStorage
from src.retriever.assets.downloader import AssetDownloader
from src.retriever.download.request import DownloadRequest
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
        download_banner=False, # Example
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

    # The AssetDownloader needs a BrowserContext, but we can't pass it directly
    # as it's not started yet. For now, we'll create a temporary client.
    # In a real app, the DI container would manage this.
    asset_downloader = AssetDownloader(storage, None, context) # Observer is optional

    engine = DownloadEngine(context, storage, asset_downloader)

    # --- Execution ---
    try:
        context.start()
        result = await engine.download(request)

        # --- Summary ---
        print("\n--- Final Result ---")
        print(json.dumps(asdict(result), indent=2))

    finally:
        print("\nClosing browser context...")
        context.close()


if __name__ == "__main__":
    asyncio.run(main())
