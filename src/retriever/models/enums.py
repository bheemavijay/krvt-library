from enum import Enum, auto

class NavigationStatus(Enum):
    SUCCESS = auto()
    CHALLENGE = auto()
    TIMEOUT = auto()
    FAILED = auto()
    REDIRECT_LOOP = auto()

class PageType(Enum):
    REAL_PAGE = auto()
    CLOUDFLARE = auto()
    UNKNOWN = auto()

class SourceType(Enum):
    HTML = auto()
    META = auto()
    JSON_LD = auto()
    OPEN_GRAPH = auto()
    ATTRIBUTE = auto()

class Confidence(Enum):
    HIGH = auto()
    MEDIUM = auto()
    LOW = auto()
    NOT_FOUND = auto()

class NavigationMode(Enum):
    """Defines the waiting strategy for page navigation."""
    CLOUDFLARE = auto()  # Poll until real content is detected (for sites with heavy anti-bot)
    DOM_READY = auto()   # Wait only for the DOM to be ready (for simple sites)
