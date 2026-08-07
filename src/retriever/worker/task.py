from dataclasses import dataclass
from typing import Any

from src.retriever.providers.base import BaseProvider
from src.retriever.retry.executor import RetryExecutor
from src.retriever.runtime.context import RuntimeContext
from src.retriever.normalizers.chapter_normalizer import ChapterNormalizer
from src.retriever.models.provider import ChapterSummary

@dataclass
class DownloadTask:
    """
    Represents a single, self-contained unit of work for a worker.
    It includes all dependencies needed to process one chapter.
    """
    chapter_summary: ChapterSummary
    provider: BaseProvider
    retry_executor: RetryExecutor
    runtime: RuntimeContext
    chapter_normalizer: ChapterNormalizer
    # Add any other dependencies a worker might need
