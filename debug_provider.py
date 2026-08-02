import json
import time
from dataclasses import asdict
from bs4 import BeautifulSoup
from src.retriever.config.settings import Settings
from src.retriever.core.context import BrowserContext
from src.retriever.profiles.manager import ProfileManager
from src.retriever.providers.readnovelmtl.provider import ReadNovelMTLProvider
from src.retriever.models.provider import Novel

def main():
    start_time = time.time()

    # --- Retrieval Phase ---
    profile_manager = ProfileManager(root_dir="profiles")
    profile_path = profile_manager.get_profile_path("default/main")
    settings = Settings(profile_path=profile_path, headless=False) # Headless must be False for manual Cloudflare
    context = BrowserContext(settings)

    novel_page_html = ""
    novel_url = "https://readnovelmtl.com/novel/refused-sss-rank-profession-i-became-the-strongest-bug-k0qqe"

    try:
        print("--- Phase 1: Retrieving Novel Page ---")
        context.start()
        raw_response = context.get(novel_url)
        novel_page_html = raw_response.html
        print("Novel page retrieved successfully.")

        # --- Parsing Phase 1: Metadata and Chapter List ---
        print("\n--- Phase 2: Parsing Novel Metadata & Chapter List ---")
        soup = BeautifulSoup(novel_page_html, 'html.parser')
        provider = ReadNovelMTLProvider()

        metadata = provider.parse_metadata(soup)
        chapters = provider.parse_chapter_list(soup, novel_url)

        novel_result = Novel(metadata=metadata, chapters=chapters)

        print(f"  - Title: {novel_result.metadata.title}")
        print(f"  - Chapters Found: {len(novel_result.chapters)}")

        # --- Retrieval Phase 2: First Chapter ---
        if not chapters:
            print("No chapters found, cannot proceed.")
            return

        first_chapter_url = chapters[0].url
        print(f"\n--- Phase 3: Retrieving First Chapter ---")
        chapter_page_response = context.get(first_chapter_url)
        chapter_page_html = chapter_page_response.html

        with open("debug/chapter.html", "w", encoding="utf-8") as f:
            f.write(chapter_page_html)
        print("Chapter page retrieved and saved.")

        # --- Parsing Phase 2: Chapter Content ---
        print("\n--- Phase 4: Parsing Chapter Content ---")
        chapter_soup = BeautifulSoup(chapter_page_html, 'html.parser')

        # *** SANITY CHECK ADDED HERE ***
        content_div = chapter_soup.select_one("#content")
        if content_div:
            raw_p_count = len(content_div.find_all("p", recursive=False))
            print(f"  - Sanity Check: Found {raw_p_count} raw <p> tags in #content.")

        chapter_content = provider.parse_chapter(chapter_soup, first_chapter_url)

        print(f"  - Chapter Title: {chapter_content.title}")
        paragraphs = chapter_content.content_text.split('\n\n')
        print(f"  - Paragraphs Parsed: {len(paragraphs)}")
        print(f"  - Word Count: {chapter_content.word_count}")
        print(f"  - Est. Reading Time: {chapter_content.reading_minutes} min")
        print(f"  - Previous URL: {chapter_content.previous_url}")
        print(f"  - Next URL: {chapter_content.next_url}")
        print(f"  - First Paragraph: '{paragraphs[0]}'")
        print(f"  - Last Paragraph: '{paragraphs[-1]}'")

        # --- Save Results ---
        provider_output_path = "provider_result.json"
        with open(provider_output_path, "w", encoding="utf-8") as f:
            json.dump(asdict(novel_result), f, ensure_ascii=False, indent=2)
        print(f"\nFull novel data saved to: {provider_output_path}")

        chapter_output_path = "chapter_result.json"
        with open(chapter_output_path, "w", encoding="utf-8") as f:
            json.dump(asdict(chapter_content), f, ensure_ascii=False, indent=2)
        print(f"First chapter content saved to: {chapter_output_path}")

    finally:
        total_time = time.time() - start_time
        print(f"\nTotal execution time: {total_time:.2f} seconds")
        print("Closing browser context...")
        context.close()


if __name__ == "__main__":
    main()
