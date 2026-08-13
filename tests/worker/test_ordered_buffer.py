import pytest
from unittest.mock import MagicMock

from src.retriever.worker.ordered_buffer import OrderedBuffer
from src.retriever.worker.result import WorkerResult, WorkerResultStatus

# Mock WorkerResult and its nested structure
def create_mock_result(order: int, content: str) -> WorkerResult:
    mock_task = MagicMock()
    mock_task.chapter_summary.order = order

    return WorkerResult(
        task=mock_task,
        status=WorkerResultStatus.SUCCESS,
        content=content
    )

def test_add_in_order():
    buffer = OrderedBuffer(start_order=1)

    result1 = create_mock_result(1, "Content 1")
    buffer.add(result1)

    ready = buffer.pop_ready()
    assert len(ready) == 1
    assert ready[0].task.chapter_summary.order == 1

    result2 = create_mock_result(2, "Content 2")
    buffer.add(result2)

    ready = buffer.pop_ready()
    assert len(ready) == 1
    assert ready[0].task.chapter_summary.order == 2

    assert not buffer.has_pending()

def test_add_out_of_order():
    buffer = OrderedBuffer(start_order=1)

    result3 = create_mock_result(3, "Content 3")
    result2 = create_mock_result(2, "Content 2")
    result1 = create_mock_result(1, "Content 1")

    buffer.add(result3)
    buffer.add(result2)

    assert buffer.has_pending()
    assert len(buffer.pop_ready()) == 0 # 1 is missing

    buffer.add(result1)
    assert buffer.has_pending()

    ready = buffer.pop_ready()
    assert len(ready) == 3
    assert ready[0].task.chapter_summary.order == 1
    assert ready[1].task.chapter_summary.order == 2
    assert ready[2].task.chapter_summary.order == 3

    assert not buffer.has_pending()

def test_add_mixed_order():
    buffer = OrderedBuffer(start_order=1)

    buffer.add(create_mock_result(2, "Content 2"))
    buffer.add(create_mock_result(4, "Content 4"))
    buffer.add(create_mock_result(1, "Content 1"))

    ready1 = buffer.pop_ready()
    assert len(ready1) == 2
    assert ready1[0].task.chapter_summary.order == 1
    assert ready1[1].task.chapter_summary.order == 2
    assert buffer.has_pending()

    buffer.add(create_mock_result(3, "Content 3"))

    ready2 = buffer.pop_ready()
    assert len(ready2) == 2
    assert ready2[0].task.chapter_summary.order == 3
    assert ready2[1].task.chapter_summary.order == 4

    assert not buffer.has_pending()

def test_reset_buffer():
    buffer = OrderedBuffer(start_order=1)
    buffer.add(create_mock_result(2, "Content 2"))

    assert buffer.has_pending()

    buffer.reset(start_order=10)

    assert not buffer.has_pending()
    assert buffer._next_order == 10

    buffer.add(create_mock_result(10, "Content 10"))
    ready = buffer.pop_ready()
    assert len(ready) == 1
    assert ready[0].task.chapter_summary.order == 10
