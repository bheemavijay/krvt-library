from dataclasses import dataclass
from src.retriever.retry.executor import RetryExecutor
from src.retriever.rate_limit.limiter import RateLimiter
from src.retriever.metrics.collector import MetricsCollector
from src.retriever.observers.observer import DownloadObserver

@dataclass(frozen=True)
class RuntimeServices:
    """
    A container for all runtime services used by the download engine.
    This provides a single point of dependency injection for services
    like retry, rate limiting, metrics, and observation.
    """
    retry_executor: RetryExecutor
    rate_limiter: RateLimiter
    metrics: MetricsCollector
    observer: DownloadObserver
