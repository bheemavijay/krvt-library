from ..models.raw_metadata import RawNovelMetadata
from ..models.novel_metadata import NovelMetadata
from .genre_dictionary import KNOWN_GENRES
from .status_normalizer import normalize_status
import hashlib
import re

def generate_slug(title: str) -> str:
    # Convert to lowercase
    slug = title.lower()
    # Replace spaces and special characters with hyphens
    slug = re.sub(r'[\s\W]+', '-', slug)
    # Remove leading/trailing hyphens
    slug = slug.strip('-')
    return slug

class MetadataNormalizer:
    def normalize(self, raw_metadata: RawNovelMetadata) -> NovelMetadata:

        genres = []
        tags = []
        for label in raw_metadata.labels:
            if label in KNOWN_GENRES:
                genres.append(label)
            else:
                tags.append(label)

        slug = generate_slug(raw_metadata.title)

        # Generate a unique ID based on provider and slug
        id_string = f"{raw_metadata.provider}-{slug}"
        novel_id = hashlib.md5(id_string.encode()).hexdigest()

        return NovelMetadata(
            id=novel_id,
            provider=raw_metadata.provider,
            slug=slug,
            title=raw_metadata.title,
            alternativeTitles=raw_metadata.alternativeTitles,
            author=raw_metadata.author,
            artist=raw_metadata.artist,
            description=raw_metadata.description,
            status=normalize_status(raw_metadata.status),
            genres=sorted(list(set(genres))),
            tags=sorted(list(set(tags))),
            rating=raw_metadata.rating,
            ratingCount=raw_metadata.ratingCount,
            views=raw_metadata.views,
            bookmarks=raw_metadata.bookmarks,
            chapterCount=raw_metadata.chapterCount,
            language=raw_metadata.language,
            sourceUrl=raw_metadata.sourceUrl,
        )
