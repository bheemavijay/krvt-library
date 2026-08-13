import pytest
import asyncio
from unittest.mock import MagicMock, AsyncMock

from src.retriever.retry.executor import RetryExecutor
from src.retriever.retry.policy import RetryPolicy
from src.retriever.retry.classifier import FailureClassifier, FailureType
from src.retriever.retry.observer import RetryObserver
from src.retriever.runtime.context import RuntimeContext

@pytest.mark.asyncio
async def test_execute_success_first_try():
    # 1. Setup
    successful_function = AsyncMock(return_value="Success")

    retry_policy = MagicMock(spec=RetryPolicy)
    failure_classifier = MagicMock(spec=FailureClassifier)
    retry_observer = MagicMock(spec=RetryObserver)

    executor = RetryExecutor(
        policy=retry_policy,
        classifier=failure_classifier,
        observer=retry_observer
    )

    # 2. Execute
    result = await executor.execute(successful_function, "test_op")

    # 3. Assert
    assert result == "Success"
    successful_function.assert_called_once()
    retry_policy.should_retry.assert_not_called()
    retry_observer.retry_started.assert_called_once()
    retry_observer.retry_succeeded.assert_called_once()
    retry_observer.retry_attempt.assert_not_called()
    retry_observer.retry_exhausted.assert_not_called()

@pytest.mark.asyncio
async def test_execute_retry_and_succeed():
    # 1. Setup
    failing_function = AsyncMock(side_effect=[Exception("Fail"), "Success"])

    retry_policy = MagicMock(spec=RetryPolicy)
    retry_policy.should_retry.return_value = True
    retry_policy.delay_seconds.return_value = 0.01

    failure_classifier = MagicMock(spec=FailureClassifier)
    failure_classifier.classify.return_value = FailureType.TRANSIENT

    retry_observer = MagicMock(spec=RetryObserver)

    executor = RetryExecutor(
        policy=retry_policy,
        classifier=failure_classifier,
        observer=retry_observer
    )

    # 2. Execute
    result = await executor.execute(failing_function, "test_op_retry")

    # 3. Assert
    assert result == "Success"
    assert failing_function.call_count == 2
    retry_policy.should_retry.assert_called_once_with(1, FailureType.TRANSIENT)
    retry_observer.retry_attempt.assert_called_once()
    retry_observer.retry_succeeded.assert_called_once()
    retry_observer.retry_exhausted.assert_not_called()

@pytest.mark.asyncio
async def test_execute_retry_exhausted():
    # 1. Setup
    failing_function = AsyncMock(side_effect=Exception("Permanent Fail"))

    retry_policy = MagicMock(spec=RetryPolicy)
    retry_policy.should_retry.return_value = False # No retries

    failure_classifier = MagicMock(spec=FailureClassifier)
    failure_classifier.classify.return_value = FailureType.PERMANENT

    retry_observer = MagicMock(spec=RetryObserver)

    executor = RetryExecutor(
        policy=retry_policy,
        classifier=failure_classifier,
        observer=retry_observer
    )

    # 2. Execute and Assert
    with pytest.raises(Exception, match="Permanent Fail"):
        await executor.execute(failing_function, "test_op_exhausted")

    assert failing_function.call_count == 1
    retry_policy.should_retry.assert_called_once_with(1, FailureType.PERMANENT)
    retry_observer.retry_attempt.assert_called_once()
    retry_observer.retry_exhausted.assert_called_once()
    retry_observer.retry_succeeded.assert_not_called()

@pytest.mark.asyncio
async def test_cancellation_during_wait():
    # 1. Setup
    failing_function = AsyncMock(side_effect=Exception("Fail"))

    retry_policy = MagicMock(spec=RetryPolicy)
    retry_policy.should_retry.return_value = True
    retry_policy.delay_seconds.return_value = 10 # Long delay

    failure_classifier = MagicMock(spec=FailureClassifier)
    failure_classifier.classify.return_value = FailureType.TRANSIENT

    runtime_context = RuntimeContext()

    async def cancel_after_delay():
        await asyncio.sleep(0.1)
        runtime_context.cancel()

    executor = RetryExecutor(policy=retry_policy, classifier=failure_classifier)

    # 2. Execute and Assert
    with pytest.raises(asyncio.CancelledError):
        await asyncio.gather(
            executor.execute(failing_function, "test_op_cancel", runtime=runtime_context),
            cancel_after_delay()
        )

    assert failing_function.call_count == 1
