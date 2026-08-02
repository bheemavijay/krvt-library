from src.retriever.extractors.registry import SelectorRegistry
from src.retriever.models.extraction import SelectorDefinition
from src.retriever.models.enums import SourceType, Confidence

class ReadNovelMtlSelectors(SelectorRegistry):
    """
    Provider-specific SelectorRegistry for ReadNovelMTL.
    """
    SELECTORS = {
        **SelectorRegistry.SELECTORS,
        "title": [
            SelectorDefinition(css="h1.h3.fw-bold.mb-1", source_type=SourceType.HTML, confidence=Confidence.HIGH),
        ] + SelectorRegistry.SELECTORS["title"],
        "alternative_title": [
            SelectorDefinition(css="p.text-secondary.fw-normal.mb-3", source_type=SourceType.HTML, confidence=Confidence.HIGH),
        ],
        "author": [
            SelectorDefinition(css="a[href*='/novel?author=']", source_type=SourceType.HTML, confidence=Confidence.HIGH),
        ] + SelectorRegistry.SELECTORS["author"],
        "cover": [
             SelectorDefinition(css="div.position-relative.shadow-sm.rounded.overflow-hidden img", source_type=SourceType.ATTRIBUTE, confidence=Confidence.HIGH, attribute='src'),
        ] + SelectorRegistry.SELECTORS["cover"],
        "description": [
            SelectorDefinition(css="div.mb-4[style='font-size: 1rem;']", source_type=SourceType.HTML, confidence=Confidence.HIGH),
        ] + SelectorRegistry.SELECTORS["description"],
        "genres": [
            SelectorDefinition(css="div.d-flex.flex-wrap.gap-2 a.badge", source_type=SourceType.HTML, confidence=Confidence.HIGH),
        ] + SelectorRegistry.SELECTORS["genres"],
        "status": [
            SelectorDefinition(css="i.fas.fa-info-circle ~ span.text-body", source_type=SourceType.HTML, confidence=Confidence.HIGH),
        ],
        "rating": [
            SelectorDefinition(css="div.d-flex.align-items-center.gap-2.text-warning strong.text-body", source_type=SourceType.HTML, confidence=Confidence.HIGH),
        ],
        "chapter_count": [
            SelectorDefinition(css="i.fas.fa-book ~ span.text-body", source_type=SourceType.HTML, confidence=Confidence.HIGH),
        ],
        "chapters": [
            SelectorDefinition(css="div.accordion-body a.text-decoration-none.text-primary", source_type=SourceType.HTML, confidence=Confidence.HIGH),
        ] + SelectorRegistry.SELECTORS["chapters"],
    }
