import pytest
import asyncio
import time
from src.retriever.runtime.context import CancellationToken, PauseToken, RuntimeContext
from src.retriever.runtime.exceptions import CancellationException

@pytest.mark.asyncio
async def test_cancellation_token_initial_state():
    token = CancellationToken()
    assert not token.is_cancelled

@pytest.mark.asyncio
async def test_cancellation_token_cancel():
    token = CancellationToken()
    token.cancel()
    assert token.is_cancelled

@pytest.mark.asyncio
async def test_cancellation_token_throw_if_cancelled():
    token = CancellationToken()
    with pytest.raises(CancellationException):
        token.cancel()
        token.throw_if_cancelled()

@pytest.mark.asyncio
async def test_pause_token_initial_state():
    token = PauseToken()
    assert not token.is_paused

@pytest.mark.asyncio
async def test_pause_token_pause_resume():
    token = PauseToken()
    token.pause()
    assert token.is_paused
    token.resume()
    assert not token.is_paused

@pytest.mark.asyncio
async def test_pause_token_wait_if_paused():
    token = PauseToken()
    token.pause()

    async def unpause_after_delay():
        await asyncio.sleep(0.1)
        token.resume()

    start_time = time.time()
    await asyncio.gather(
        token.wait_if_paused(),
        unpause_after_delay()
    )
    end_time = time.time()
    assert (end_time - start_time) >= 0.1
    assert not token.is_paused

@pytest.mark.asyncio
async def test_runtime_context_check_cancellation():
    runtime = RuntimeContext()
    runtime.cancellation.cancel()
    with pytest.raises(CancellationException):
        runtime.check()

@pytest.mark.asyncio
async def test_runtime_context_check_pause():
    runtime = RuntimeContext()
    runtime.pause.pause()

    async def unpause_after_delay():
        await asyncio.sleep(0.1)
        runtime.pause.resume()

    start_time = time.time()
    await asyncio.gather(
        runtime.check(),
        unpause_after_delay()
    )
    end_time = time.time()
    assert (end_time - start_time) >= 0.1
    assert not runtime.pause.is_paused

@pytest.mark.asyncio
async def test_runtime_context_wait_cancellation():
    runtime = RuntimeContext()

    async def cancel_after_delay():
        await asyncio.sleep(0.05)
        runtime.cancellation.cancel()

    start_time = time.time()
    with pytest.raises(CancellationException):
        await asyncio.gather(
            runtime.wait(1), # Try to wait for 1 second
            cancel_after_delay()
        )
    end_time = time.time()
    assert (end_time - start_time) < 1 # Should be interrupted before 1 second

@pytest.mark.asyncio
async def test_runtime_context_wait_pause():
    runtime = RuntimeContext()
    runtime.pause.pause()

    async def unpause_after_delay():
        await asyncio.sleep(0.1)
        runtime.pause.resume()

    start_time = time.time()
    await asyncio.gather(
        runtime.wait(0.2), # Wait for 0.2 seconds, but will be paused for 0.1
        unpause_after_delay()
    )
    end_time = time.time()
    # The total wait time should be approximately 0.2 (0.1 for pause + 0.1 for actual wait)
    assert (end_time - start_time) >= 0.2
    assert not runtime.pause.is_paused
