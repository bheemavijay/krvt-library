from typing import List, Dict
from ..models.enums import SourceType, Confidence
from ..models.extraction import SelectorDefinition

class SelectorRegistry:
    """
    A generic, provider-agnostic registry of SelectorDefinitions for common metadata.
    This defines a baseline set of selectors that providers can extend.
    """

    # The order here defines a fallback chain, but the primary sorting
    # will be done by the Extractor based on source_type priority.
    SELECTORS: Dict[str, List[SelectorDefinition]] = {
        "title": [
            SelectorDefinition(css="meta[property='og:title']", source_type=SourceType.OPEN_GRAPH, confidence=Confidence.HIGH, attribute='content'),
            SelectorDefinition(css="title", source_type=SourceType.HTML, confidence=Confidence.MEDIUM),
            SelectorDefinition(css="h1", source_type=SourceType.HTML, confidence=Confidence.MEDIUM),
        ],
        "author": [
            SelectorDefinition(css="meta[name='author']", source_type=SourceType.META, confidence=Confidence.HIGH, attribute='content'),
            SelectorDefinition(css="[itemprop=author]", source_type=SourceType.HTML, confidence=Confidence.MEDIUM),
            SelectorDefinition(css=".author", source_type=SourceType.HTML, confidence=Confidence.LOW),
        ],
        "cover": [
            SelectorDefinition(css="meta[property='og:image']", source_type=SourceType.OPEN_GRAPH, confidence=Confidence.HIGH, attribute='content'),
            SelectorDefinition(css="img.cover", source_type=SourceType.ATTRIBUTE, confidence=Confidence.MEDIUM, attribute='src'),
            SelectorDefinition(css="img[itemprop=image]", source_type=SourceType.ATTRIBUTE, confidence=Confidence.MEDIUM, attribute='src'),
        ],
        "description": [
            SelectorDefinition(css="meta[property='og:description']", source_type=SourceType.OPEN_GRAPH, confidence=Confidence.HIGH, attribute='content'),
            SelectorDefinition(css="meta[name='description']", source_type=SourceType.META, confidence=Confidence.HIGH, attribute='content'),
            SelectorDefinition(css=".description", source_type=SourceType.HTML, confidence=Confidence.LOW),
        ],
        "genres": [
            SelectorDefinition(css="[itemprop=genre]", source_type=SourceType.HTML, confidence=Confidence.MEDIUM),
            SelectorDefinition(css=".genres a", source_type=SourceType.HTML, confidence=Confidence.LOW),
            SelectorDefinition(css=".category a", source_type=SourceType.HTML, confidence=Confidence.LOW),
        ],
        "chapters": [
            SelectorDefinition(css=".chapter-list a", source_type=SourceType.HTML, confidence=Confidence.HIGH),
            SelectorDefinition(css="#chapter-list a", source_type=SourceType.HTML, confidence=Confidence.HIGH),
        ]
    }

    def get_selectors(self, field: str) -> List[SelectorDefinition]:
        return self.SELECTORS.get(field, [])
