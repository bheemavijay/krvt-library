import threading
import time
from dataclasses import dataclass, field
from .exceptions import CancellationException

class CancellationToken:
    """A token to signal cancellation."""
    def __init__(self):
        self._cancelled = False
        self._lock = threading.Lock()

    @property
    def is_cancelled(self) -> bool:
        with self._lock:
            return self._cancelled

    def cancel(self):
        with self._lock:
            self._cancelled = True

    def throw_if_cancelled(self):
        if self.is_cancelled:
            raise CancellationException("Operation was cancelled.")

class PauseToken:
    """A token to pause and resume an operation using threading.Event."""
    def __init__(self):
        self._event = threading.Event()
        self._event.set()  # Initially not paused

    @property
    def is_paused(self) -> bool:
        return not self._event.is_set()

    def pause(self):
        self._event.clear()

    def resume(self):
        self._event.set()

    def wait_if_paused(self):
        self._event.wait()

@dataclass
class RuntimeContext:
    """Encapsulates runtime objects like cancellation and pause tokens."""
    cancellation: CancellationToken = field(default_factory=CancellationToken)
    pause: PauseToken = field(default_factory=PauseToken)

    def check(self):
        """Checks for cancellation and waits if paused."""
        self.cancellation.throw_if_cancelled()
        self.pause.wait_if_paused()

    def wait(self, delay_seconds: float):
        """
        Waits for a given delay, but is interruptible by cancellation.
        Also respects the pause token.
        """
        end_time = time.time() + delay_seconds
        while time.time() < end_time:
            self.check()
            # Sleep in small intervals to be responsive to cancellation
            time.sleep(min(0.1, end_time - time.time()))
