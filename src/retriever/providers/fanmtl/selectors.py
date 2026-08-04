from src.retriever.extractors.registry import SelectorRegistry
from src.retriever.models.extraction import SelectorDefinition
from src.retriever.models.enums import SourceType, Confidence

class FanMtlSelectors(SelectorRegistry):
    SELECTORS = {
        **SelectorRegistry.SELECTORS,
        "title": [
            SelectorDefinition(css="h1.novel-title", source_type=SourceType.HTML, confidence=Confidence.HIGH),
        ],
        "alternative_title": [
            SelectorDefinition(css="h2.alternative-title", source_type=SourceType.HTML, confidence=Confidence.HIGH),
        ],
        "author": [
            SelectorDefinition(css="div.author span[itemprop='author']", source_type=SourceType.HTML, confidence=Confidence.HIGH),
        ],
        "cover": [
            SelectorDefinition(css="figure.cover img", source_type=SourceType.ATTRIBUTE, confidence=Confidence.HIGH, attribute='src'),
        ],
        "description": [
            SelectorDefinition(css=".summary .content", source_type=SourceType.HTML, confidence=Confidence.HIGH),
        ],
        "genres": [
            SelectorDefinition(css=".categories ul li a.property-item", source_type=SourceType.HTML, confidence=Confidence.HIGH),
        ],
        "tags": [
            SelectorDefinition(css=".categories ul li a.tag", source_type=SourceType.HTML, confidence=Confidence.MEDIUM),
        ],
        "status": [
            SelectorDefinition(css=".header-stats span:nth-of-type(2) strong", source_type=SourceType.HTML, confidence=Confidence.HIGH),
        ],
        "chapter_count": [
            SelectorDefinition(css=".header-stats span:nth-of-type(1) strong", source_type=SourceType.HTML, confidence=Confidence.HIGH),
        ],
        "chapters": [
            SelectorDefinition(css="ul.chapter-list li a", source_type=SourceType.HTML, confidence=Confidence.HIGH),
        ],
        "chapter_title": [
            SelectorDefinition(css="header.chapter-header h2", source_type=SourceType.HTML, confidence=Confidence.HIGH),
        ],
        "chapter_content": [
            SelectorDefinition(css="div.chapter-content", source_type=SourceType.HTML, confidence=Confidence.HIGH),
        ],
        "next_chapter_url": [
            SelectorDefinition(css="a.chnav.next", source_type=SourceType.ATTRIBUTE, confidence=Confidence.HIGH, attribute='href'),
        ],
        "prev_chapter_url": [
            SelectorDefinition(css="a.chnav.prev:not(.isDisabled)", source_type=SourceType.ATTRIBUTE, confidence=Confidence.HIGH, attribute='href'),
        ],
    }
