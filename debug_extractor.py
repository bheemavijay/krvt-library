from bs4 import BeautifulSoup
from src.retriever.extractors.extractor import Extractor
from src.retriever.extractors.registry import SelectorRegistry
from src.retriever.models.extraction import SelectorDefinition
from src.retriever.models.enums import SourceType, Confidence

def main():
    """
    This script demonstrates the REFINED generic extraction framework.
    It uses a provider-specific registry that inherits from the generic one.
    """
    try:
        with open('debug/output.html', 'r', encoding='utf-8') as f:
            html_content = f.read()
    except FileNotFoundError:
        print("Error: 'debug/output.html' not found.")
        print("Please run the retrieval experiment (debug.py) first to generate this file.")
        return

    soup = BeautifulSoup(html_content, 'html.parser')

    # --- Provider-specific registry extending the generic one ---
    class ReadNovelMtlRegistry(SelectorRegistry):
        # Provider-specific overrides and additions
        SELECTORS = {
            **SelectorRegistry.SELECTORS, # Inherit generic selectors
            "title": [
                SelectorDefinition(css="h1.h3.fw-bold.mb-1", source_type=SourceType.HTML, confidence=Confidence.HIGH),
            ] + SelectorRegistry.SELECTORS["title"], # Add to and prioritize specific selectors
            "author": [
                SelectorDefinition(css="a[href*='/novel?author=']", source_type=SourceType.HTML, confidence=Confidence.HIGH),
            ] + SelectorRegistry.SELECTORS["author"],
        }

    registry = ReadNovelMtlRegistry()
    extractor = Extractor(soup, registry)

    print("--- Refined Generic Extraction Framework Test ---")

    # --- Extract Title ---
    print("\n[1] Extracting Title:")
    title_result = extractor.extract('title')
    print(f"  - Value: '{title_result.value}'")
    print(f"  - Source: {title_result.source_type.name if title_result.source_type else 'N/A'}")
    print(f"  - Selector Used: '{title_result.selector_used}'")
    print(f"  - Confidence: {title_result.confidence.name}")

    # --- Extract Author ---
    print("\n[2] Extracting Author:")
    author_result = extractor.extract('author')
    print(f"  - Value: '{author_result.value}'")
    print(f"  - Source: {author_result.source_type.name if author_result.source_type else 'N/A'}")
    print(f"  - Selector Used: '{author_result.selector_used}'")
    print(f"  - Confidence: {author_result.confidence.name}")

    # --- Extract Cover (using generic selectors) ---
    print("\n[3] Extracting Cover:")
    cover_result = extractor.extract('cover')
    print(f"  - Value: '{cover_result.value}'")
    print(f"  - Source: {cover_result.source_type.name if cover_result.source_type else 'N/A'}")
    print(f"  - Selector Used: '{cover_result.selector_used}'")
    print(f"  - Confidence: {cover_result.confidence.name}")

    # --- Extract JSON-LD ---
    print("\n[4] Extracting JSON-LD blocks:")
    json_ld_data = extractor.extract_json_ld()
    print(f"  - Found {len(json_ld_data)} JSON-LD blocks.")
    if json_ld_data:
        # Print the type of the first block to show it was parsed
        print(f"  - First block '@type': {json_ld_data[0].get('@type')}")


if __name__ == "__main__":
    main()
