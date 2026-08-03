import json
import time
from dataclasses import asdict
from src.retriever.config.settings import Settings
from src.retriever.core.context import BrowserContext
from src.retriever.profiles.manager import ProfileManager
from src.retriever.providers.manager import ProviderManager
from src.retriever.download.downloader import Downloader

def main():
    # --- Configuration ---
    novel_url = "https://readnovelmtl.com/novel/refused-sss-rank-profession-i-became-the-strongest-bug-k0qqe"

    # --- Resolve Provider ---
    try:
        provider = ProviderManager.resolve(novel_url)
    except ValueError as e:
        print(e)
        return

    # --- Setup ---
    profile_manager = ProfileManager(root_dir="profiles")
    profile_path = profile_manager.get_profile_path("default/main")
    settings = Settings(profile_path=profile_path, headless=False) # Must be headful for manual Cloudflare

    context = BrowserContext(settings)
    downloader = Downloader(context)

    # --- Execution ---
    try:
        context.start()
        novel = downloader.download(provider, novel_url)

        # --- Summary ---
        print("\n--- Final Result ---")
        print(f"Title: {novel.metadata.title}")
        print(f"Author: {novel.metadata.author}")
        print(f"Total Chapters in Metadata: {novel.metadata.chapter_count}")
        print(f"Downloaded Chapters: {len(novel.chapters)}")

        # --- Save Result ---
        output_path = "full_novel_result.json"
        with open(output_path, "w", encoding="utf-8") as f:
            # A proper implementation would have a unified Novel model.
            # For now, we save the structure we have.
            json.dump(asdict(novel), f, ensure_ascii=False, indent=2)
        print(f"\nFull novel data saved to: {output_path}")

    finally:
        print("\nClosing browser context...")
        context.close()


if __name__ == "__main__":
    main()
