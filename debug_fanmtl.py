import json
import time
from dataclasses import asdict
from bs4 import BeautifulSoup
from src.retriever.config.settings import Settings
from src.retriever.core.context import BrowserContext
from src.retriever.profiles.manager import ProfileManager
from src.retriever.providers.manager import ProviderManager
from src.retriever.models.provider import Novel

def main():
    start_time = time.time()

    # --- Configuration ---
    novel_url = "https://www.fanmtl.com/novel/sign-in-the-man-is-on-an-isolated-island-and-he-has-just-built-a-luxury-villa-by-himself.html"

    # --- Resolve Provider ---
    try:
        provider = ProviderManager.resolve(novel_url)
        print(f"--- Resolved Provider: {provider.name} ---")
    except ValueError as e:
        print(e)
        return

    # --- Setup ---
    profile_manager = ProfileManager(root_dir="profiles")
    profile_path = profile_manager.get_profile_path("fanmtl_profile")
    settings = Settings(profile_path=profile_path, headless=True)
    context = BrowserContext(settings)

    # --- Execution ---
    try:
        context.start()
        print("\n[Phase 1] Retrieving novel page...")
        novel_page_html = context.get(novel_url).html
        print("  - Novel page retrieved.")

        # --- Parsing ---
        print("\n[Phase 2] Parsing novel...")
        soup = BeautifulSoup(novel_page_html, 'html.parser')

        metadata = provider.parse_metadata(soup)
        chapters = provider.parse_chapter_list(soup, novel_url)

        print(f"  - Metadata: '{metadata.title}' with {metadata.chapter_count} chapters.")
        print(f"  - Chapter List: Found {len(chapters)} chapters.")

        if not chapters:
            return

        first_chapter_url = chapters[0].url
        print(f"\n[Phase 3] Retrieving first chapter ({first_chapter_url})...")
        chapter_page_html = context.get(first_chapter_url).html
        print("  - Chapter page retrieved.")

        print("\n[Phase 4] Parsing chapter...")
        chapter_soup = BeautifulSoup(chapter_page_html, 'html.parser')
        chapter_content = provider.parse_chapter(chapter_soup, first_chapter_url)

        # --- Summary ---
        print("\n--- Final Result ---")
        print(f"Novel Title: {metadata.title}")
        print(f"Chapter Title: {chapter_content.title}")
        print(f"Paragraphs: {len(chapter_content.content_text.splitlines())}")
        print(f"Word Count: {chapter_content.word_count}")
        print(f"Next URL: {chapter_content.next_url}")

        # --- Save Results ---
        novel_result = Novel(metadata=metadata, chapters=chapters)
        with open("debug/fanmtl_provider_result.json", "w", encoding="utf-8") as f:
            json.dump(asdict(novel_result), f, ensure_ascii=False, indent=2)
        print("\nFull novel data saved to debug/fanmtl_provider_result.json")

        with open("debug/fanmtl_chapter_result.json", "w", encoding="utf-8") as f:
            json.dump(asdict(chapter_content), f, ensure_ascii=False, indent=2)
        print("First chapter content saved to debug/fanmtl_chapter_result.json")

    finally:
        total_time = time.time() - start_time
        print(f"\nTotal execution time: {total_time:.2f} seconds")
        print("Closing browser context...")
        context.close()

if __name__ == "__main__":
    main()
