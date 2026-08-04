import re

from ..models.raw_metadata import RawNovelMetadata
from ..models.novel_metadata import NovelMetadata
from .genre_dictionary import KNOWN_GENRES
from .status_normalizer import normalize_status

def _generate_slug(title: str) -> str:
    """Creates a URL-friendly slug from a title."""
    slug = title.lower()
    slug = re.sub(r'[\s\W]+', '-', slug) # Replace spaces and non-word characters with hyphens
    slug = slug.strip('-') # Remove leading/trailing hyphens
    return slug

class MetadataNormalizer:
    """
    Takes a RawNovelMetadata object from a provider and converts it into a
    canonical, system-wide NovelMetadata object.
    """
    def normalize(self, raw: RawNovelMetadata) -> NovelMetadata:

        # Classify labels into categories (canonical genres) and tags
        categories = sorted([label for label in raw.labels if label in KNOWN_GENRES])
        tags = sorted([label for label in raw.labels if label not in KNOWN_GENRES])

        slug = _generate_slug(raw.title)

        # Create the final, normalized metadata object
        return NovelMetadata(
            title=raw.title,
            alternative_titles=raw.alternativeTitles,
            author=raw.author,
            description=raw.description,
            status=normalize_status(raw.status),
            language=raw.language,
            categories=categories,
            tags=tags,
            rating=raw.rating,
            views=raw.views,
            chapter_count=raw.chapterCount,
            slug=slug,
        )
