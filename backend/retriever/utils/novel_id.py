import re

def _slugify(text: str) -> str:
    """
    Converts a string into a URL-friendly slug.
    Limits the length to a reasonable number of characters.
    """
    text = text.lower()
    text = re.sub(r'[\s\W_]+', '-', text)
    # Limit slug length to avoid excessively long filenames
    return text.strip('-')[:80]

def create_novel_id(provider_id: str, novel_title: str) -> str:
    """
    Generates a deterministic and unique identifier for a novel.

    This ensures that the same novel from the same provider always
    gets the same ID, preventing duplicates.

    Args:
        provider_id: A unique identifier for the provider (e.g., "fanmtl").
        novel_title: The title of the novel.

    Returns:
        A unique string ID for the novel (e.g., "fanmtl_the-legendary-mechanic").
    """
    if not provider_id or not novel_title:
        raise ValueError("provider_id and novel_title cannot be empty.")

    slug = _slugify(novel_title)
    return f"{provider_id}_{slug}"
