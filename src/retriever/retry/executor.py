import time
from typing import Callable, Any, Awaitable, TypeVar, Optional

from .policy import RetryPolicy
from .strategy import ExponentialBackoffRetry
from .classifier import FailureClassifier
from .context import RetryContext
from .observer import RetryObserver
from src.retriever.runtime.context import RuntimeContext
from src.retriever.runtime.exceptions import CancellationException

T = TypeVar("T")

class RetryExecutor:
    def __init__(
        self,
        policy: RetryPolicy = None,
        classifier: FailureClassifier = None,
        observer: Optional[RetryObserver] = None,
    ):
        self.policy = policy or ExponentialBackoffRetry()
        self.classifier = classifier or FailureClassifier()
        self.observer = observer

    async def execute(self, func: Callable[[], Awaitable[T]], operation_name: str = "Operation", runtime: RuntimeContext = None) -> T:
        runtime = runtime or RuntimeContext()
        attempts = 0
        start_time = time.time()
        last_exception = None

        if self.observer:
            self.observer.retry_started(RetryContext(operation_name, attempts, 0))

        while True:
            runtime.check()

            attempts += 1
            try:
                result = await func()
                if self.observer:
                    context = RetryContext(operation_name=operation_name, attempt=attempts, elapsed_ms=int((time.time() - start_time) * 1000))
                    self.observer.retry_succeeded(context)
                return result
            except Exception as e:
                if isinstance(e, CancellationException):
                    raise

                last_exception = e
                failure_type = self.classifier.classify(e)

                context = RetryContext(
                    operation_name=operation_name,
                    attempt=attempts,
                    elapsed_ms=int((time.time() - start_time) * 1000),
                    last_exception=last_exception,
                    failure_type=failure_type
                )
                if self.observer:
                    self.observer.retry_attempt(context)

                if not self.policy.should_retry(attempts, failure_type):
                    if self.observer:
                        self.observer.retry_exhausted(context)
                    raise last_exception

                delay = self.policy.delay_seconds(attempts)
                if self.observer:
                    self.observer.retry_waiting(context, delay)

                runtime.wait(delay)
