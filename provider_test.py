import asyncio
import sys
from src.retriever.providers.manager import ProviderManager
from src.retriever.core.context import BrowserContext
from src.retriever.config.settings import Settings

async def main():
    if len(sys.argv) != 3:
        print("Usage: python provider_test.py <provider_id> <novel_url>")
        return

    provider_id = sys.argv[1]
    novel_url = sys.argv[2]

    try:
        provider = ProviderManager.get_provider(provider_id)
    except Exception as e:
        print(f"Error getting provider: {e}")
        return

    print(f"--- Testing Provider: {provider.name} ---")

    settings = Settings(headless=True)
    context = BrowserContext(settings)

    try:
        context.start()

        # 1. Test Metadata Parsing
        print("\n[1] Testing metadata parsing...")
        document = context.get(novel_url, provider.navigation_mode)
        raw_metadata = provider.parse_metadata(document, novel_url)
        print(f"  - Title: {raw_metadata.title}")
        print(f"  - Author: {raw_metadata.author}")
        print(f"  - Cover URL: {raw_metadata.cover}")

        # 2. Test Chapter List Parsing
        print("\n[2] Testing chapter list parsing...")
        chapters = provider.parse_chapter_list(document, novel_url)
        print(f"  - Found {len(chapters)} chapters.")
        if not chapters:
            print("  - WARNING: No chapters found.")
            return

        # 3. Test Chapter Parsing
        print("\n[3] Testing first chapter parsing...")
        first_chapter_summary = chapters[0]
        chapter_doc = context.get(first_chapter_summary.url, provider.navigation_mode)
        raw_chapter = provider.parse_chapter(chapter_doc, first_chapter_summary.url)
        print(f"  - Chapter Title: {raw_chapter.title}")
        print(f"  - Content length: {len(''.join(raw_chapter.paragraphs))}")

        print("\n--- Provider Test Passed ---")

    except Exception as e:
        print(f"\n--- Provider Test Failed ---")
        print(f"Error: {e}")
    finally:
        context.close()

if __name__ == "__main__":
    asyncio.run(main())
