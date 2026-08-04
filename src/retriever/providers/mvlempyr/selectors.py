from src.retriever.extractors.registry import SelectorRegistry
from src.retriever.models.extraction import SelectorDefinition
from src.retriever.models.enums import SourceType, Confidence


class MvlempyrSelectors(SelectorRegistry):
    SELECTORS = {
        **SelectorRegistry.SELECTORS,
        "title": [
            SelectorDefinition(css="h1.novel-title", source_type=SourceType.HTML, confidence=Confidence.HIGH),
            SelectorDefinition(css=".novel-hero h1", source_type=SourceType.HTML, confidence=Confidence.HIGH),
            SelectorDefinition(css="main h1", source_type=SourceType.HTML, confidence=Confidence.MEDIUM),
        ] + SelectorRegistry.SELECTORS["title"],
        "author": [
            SelectorDefinition(css="div.mobileauthorname", source_type=SourceType.HTML, confidence=Confidence.HIGH),
            SelectorDefinition(css=".novel-meta [class*='author']", source_type=SourceType.HTML, confidence=Confidence.MEDIUM),
            SelectorDefinition(css="[class*='author']", source_type=SourceType.HTML, confidence=Confidence.LOW),
            SelectorDefinition(css="[data-author]", source_type=SourceType.ATTRIBUTE, confidence=Confidence.MEDIUM, attribute="data-author"),
        ] + SelectorRegistry.SELECTORS["author"],
        "cover": [
            SelectorDefinition(css=".novel-image-wrapper img", source_type=SourceType.ATTRIBUTE, confidence=Confidence.HIGH, attribute="src"),
            SelectorDefinition(css=".novel-hero img", source_type=SourceType.ATTRIBUTE, confidence=Confidence.MEDIUM, attribute="src"),
            SelectorDefinition(css="main img", source_type=SourceType.ATTRIBUTE, confidence=Confidence.LOW, attribute="src"),
        ] + SelectorRegistry.SELECTORS["cover"],
        "description": [
            SelectorDefinition(css="div.synopsis p", source_type=SourceType.HTML, confidence=Confidence.HIGH),
            SelectorDefinition(css=".novel-meta .synopsis", source_type=SourceType.HTML, confidence=Confidence.HIGH),
            SelectorDefinition(css="div.synopsis", source_type=SourceType.HTML, confidence=Confidence.MEDIUM),
        ] + SelectorRegistry.SELECTORS["description"],
        "labels": [
            SelectorDefinition(css=".genere-tagslist a", source_type=SourceType.HTML, confidence=Confidence.HIGH),
            SelectorDefinition(css=".genere-tagslist button", source_type=SourceType.HTML, confidence=Confidence.MEDIUM),
            SelectorDefinition(css="[class*='genre'] a", source_type=SourceType.HTML, confidence=Confidence.MEDIUM),
            SelectorDefinition(css=".tags a", source_type=SourceType.HTML, confidence=Confidence.LOW),
        ],
        "status": [
            SelectorDefinition(css=".status", source_type=SourceType.HTML, confidence=Confidence.MEDIUM),
            SelectorDefinition(css="[data-label='Status']", source_type=SourceType.HTML, confidence=Confidence.MEDIUM),
        ],
        "rating": [
            SelectorDefinition(css=".rating-value", source_type=SourceType.HTML, confidence=Confidence.MEDIUM),
            SelectorDefinition(css=".rating", source_type=SourceType.HTML, confidence=Confidence.LOW),
            SelectorDefinition(css="[data-rating]", source_type=SourceType.ATTRIBUTE, confidence=Confidence.MEDIUM, attribute="data-rating"),
        ],
        "chapters": [
            SelectorDefinition(css="a.novelreadbutton[href*='/chapter/']", source_type=SourceType.HTML, confidence=Confidence.HIGH),
            SelectorDefinition(css="a.continuebutton[href*='/chapter/']", source_type=SourceType.HTML, confidence=Confidence.HIGH),
            SelectorDefinition(css=".chapter-list a.chapter-item", source_type=SourceType.HTML, confidence=Confidence.HIGH),
            SelectorDefinition(css=".chapter-list a[href*='/chapter/']", source_type=SourceType.HTML, confidence=Confidence.HIGH),
            SelectorDefinition(css="[class*='chapter'] a[href*='/chapter/']", source_type=SourceType.HTML, confidence=Confidence.MEDIUM),
            SelectorDefinition(css="a[href*='/chapter/']", source_type=SourceType.HTML, confidence=Confidence.LOW),
        ],
        "chapter_title": [
            SelectorDefinition(css=".cha-tit h1", source_type=SourceType.HTML, confidence=Confidence.HIGH),
            SelectorDefinition(css=".chapter-shell h1", source_type=SourceType.HTML, confidence=Confidence.HIGH),
            SelectorDefinition(css="#chapter h1", source_type=SourceType.HTML, confidence=Confidence.MEDIUM),
            SelectorDefinition(css="#chapter-name", source_type=SourceType.HTML, confidence=Confidence.MEDIUM),
            SelectorDefinition(css="main h1", source_type=SourceType.HTML, confidence=Confidence.LOW),
        ],
        "chapter_content": [
            SelectorDefinition(css=".cha-words", source_type=SourceType.HTML, confidence=Confidence.HIGH),
            SelectorDefinition(css=".chapter-shell .cha-words", source_type=SourceType.HTML, confidence=Confidence.HIGH),
            SelectorDefinition(css="#chapter-content", source_type=SourceType.HTML, confidence=Confidence.MEDIUM),
            SelectorDefinition(css="#chapter", source_type=SourceType.HTML, confidence=Confidence.MEDIUM),
            SelectorDefinition(css="main article", source_type=SourceType.HTML, confidence=Confidence.LOW),
        ],
        "previous_chapter_url": [
            SelectorDefinition(css="a[href*='/chapter/'][rel='prev']", source_type=SourceType.ATTRIBUTE, confidence=Confidence.MEDIUM, attribute="href"),
            SelectorDefinition(css="a.prev[href*='/chapter/']", source_type=SourceType.ATTRIBUTE, confidence=Confidence.MEDIUM, attribute="href"),
        ],
        "next_chapter_url": [
            SelectorDefinition(css="a[href*='/chapter/'][rel='next']", source_type=SourceType.ATTRIBUTE, confidence=Confidence.MEDIUM, attribute="href"),
            SelectorDefinition(css="a.next[href*='/chapter/']", source_type=SourceType.ATTRIBUTE, confidence=Confidence.MEDIUM, attribute="href"),
        ],
    }
