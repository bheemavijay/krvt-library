from typing import List, Optional
from bs4 import BeautifulSoup, Tag
import json
from ..models.extraction import ExtractionResult, SelectorDefinition
from ..models.enums import SourceType, Confidence

class Extractor:
    def __init__(self, soup: BeautifulSoup, registry):
        self.soup = soup
        self.registry = registry
        # Define the priority of sources for extraction
        self.source_priority = [
            SourceType.JSON_LD,
            SourceType.OPEN_GRAPH,
            SourceType.META,
            SourceType.ATTRIBUTE,
            SourceType.HTML,
        ]

    def extract(self, field: str) -> ExtractionResult:
        """
        Extracts a single value for a given field by trying selectors
        in order of source priority.
        """
        selectors = self.registry.get_selectors(field)

        # Sort selectors by the defined source priority
        sorted_selectors = sorted(
            selectors,
            key=lambda s: self.source_priority.index(s.source_type)
        )

        for selector_def in sorted_selectors:
            element = self.soup.select_one(selector_def.css)
            if not element:
                continue

            value = None
            if selector_def.attribute:
                if element.has_attr(selector_def.attribute):
                    value = element[selector_def.attribute].strip()
            else:
                value = element.text.strip()

            if value:
                return ExtractionResult(
                    value=value,
                    selector_used=selector_def.css,
                    source_type=selector_def.source_type,
                    confidence=selector_def.confidence
                )

        return ExtractionResult(None, None, None, Confidence.NOT_FOUND)

    def extract_tags(self, field: str) -> List[Tag]:
        """
        Extracts a list of BeautifulSoup Tags for a given field.
        This is useful for complex list parsing where attributes and text are needed.
        """
        selectors = self.registry.get_selectors(field)
        sorted_selectors = sorted(
            selectors,
            key=lambda s: self.source_priority.index(s.source_type)
        )
        for selector_def in sorted_selectors:
            elements = self.soup.select(selector_def.css)
            if elements:
                return elements
        return []

    def extract_json_ld(self) -> List[dict]:
        """
        Specifically extracts all JSON-LD script blocks from the page.
        This is a special case as it doesn't fit the single-field model.
        """
        json_ld_scripts = self.soup.select("script[type='application/ld+json']")
        results = []
        for script in json_ld_scripts:
            try:
                data = json.loads(script.string)
                results.append(data)
            except (json.JSONDecodeError, TypeError):
                continue
        return results
