from enum import Enum

class FailureType(Enum):
    NETWORK = "network"         # Connection errors
    SERVER = "server"           # 5xx errors
    RATE_LIMIT = "rate_limit"   # 429 errors
    CLIENT = "client"           # 4xx errors (e.g., 404 Not Found)
    AUTH = "auth"               # 401, 403 errors
    PARSER = "parser"           # Errors during HTML parsing
    TIMEOUT = "timeout"         # Operation timed out
    UNKNOWN = "unknown"         # Any other exception
