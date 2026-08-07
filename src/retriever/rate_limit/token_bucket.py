import time
import threading
from typing import Dict
from .limiter import RateLimiter

class TokenBucketLimiter(RateLimiter):
    """
    A thread-safe token bucket rate limiter that supports multiple scopes.
    """
    def __init__(self):
        self._buckets: Dict[str, 'TokenBucket'] = {}
        self._lock = threading.Lock()

    def _get_or_create_bucket(self, scope: str, requests_per_second: int, burst: int) -> 'TokenBucket':
        with self._lock:
            if scope not in self._buckets:
                self._buckets[scope] = TokenBucket(requests_per_second, burst)
            return self._buckets[scope]

    def acquire(self, scope: str, requests_per_second: int, burst: int, tokens: int = 1):
        bucket = self._get_or_create_bucket(scope, requests_per_second, burst)
        bucket.wait_for_token(tokens)

class TokenBucket:
    """
    Internal implementation of a single token bucket.
    """
    def __init__(self, requests_per_second: int, burst: int):
        self.capacity = float(burst)
        self.tokens = float(burst)
        self.fill_rate = float(requests_per_second)
        self.last_update = time.monotonic()
        self.lock = threading.Lock()

    def _get_tokens(self):
        now = time.monotonic()
        elapsed = now - self.last_update
        self.tokens += elapsed * self.fill_rate
        self.tokens = min(self.capacity, self.tokens)
        self.last_update = now

    def acquire_non_blocking(self, tokens: int = 1) -> bool:
        with self.lock:
            self._get_tokens()
            if self.tokens >= tokens:
                self.tokens -= tokens
                return True
            return False

    def wait_for_token(self, tokens: int = 1):
        while not self.acquire_non_blocking(tokens):
            time.sleep(0.1)
