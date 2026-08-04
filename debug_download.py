from src.retriever.config.settings import Settings
from src.retriever.core.context import BrowserContext
from src.retriever.profiles.manager import ProfileManager
from src.retriever.providers.manager import ProviderManager
from src.retriever.download.downloader import Downloader
from src.retriever.storage.filesystem_storage import FilesystemStorage
import json
from dataclasses import asdict

def main():
    # --- Configuration ---
    novel_url = "https://www.fanmtl.com/novel/sign-in-the-man-is-on-an-isolated-island-and-he-has-just-built-a-luxury-villa-by-himself.html"
    CHAPTER_LIMIT = 10 # Set to None to download all chapters

    # --- Resolve Provider ---
    try:
        provider = ProviderManager.resolve(novel_url)
    except ValueError as e:
        print(e)
        return

    # --- Setup ---
    profile_manager = ProfileManager(root_dir="profiles")
    profile_path = profile_manager.get_profile_path(f"{provider.id}_profile")
    is_headless = "readnovelmtl" not in provider.id
    settings = Settings(profile_path=profile_path, headless=is_headless)

    context = BrowserContext(settings)
    storage = FilesystemStorage(output_dir="novels")
    downloader = Downloader(context, storage)

    # --- Execution ---
    try:
        context.start()
        novel = downloader.download(provider, novel_url, chapter_limit=CHAPTER_LIMIT)

        # --- Summary ---
        print("\n--- Final Summary ---")
        print(f"Title: {novel.metadata.title}")
        print(f"Author: {novel.metadata.author}")
        print(f"Total Chapters in Metadata: {novel.metadata.chapter_count}")
        print(f"Downloaded Chapters: {len(novel.chapters)}")

        # --- Save Result ---
        output_path = "full_novel_result.json"
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(asdict(novel), f, ensure_ascii=False, indent=2)
        print(f"\nFull novel data saved to: {output_path}")

    finally:
        print("\nClosing browser context...")
        context.close()


if __name__ == "__main__":
    main()
