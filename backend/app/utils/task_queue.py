import queue
import threading
from typing import Any, Callable


class TaskQueue:
    """Simple background task queue using a worker thread.
    Not a replacement for Celery/RQ, but keeps API non-blocking for lightweight jobs."""

    def __init__(self):
        self._queue: "queue.Queue[tuple[Callable, tuple, dict]]" = queue.Queue()
        self._thread = threading.Thread(target=self._worker, daemon=True)
        self._thread.start()

    def _worker(self):
        while True:
            func, args, kwargs = self._queue.get()
            try:
                func(*args, **kwargs)
            except Exception:
                # In production, log this to monitoring
                pass
            finally:
                self._queue.task_done()

    def submit(self, func: Callable, *args: Any, **kwargs: Any):
        self._queue.put((func, args, kwargs))


task_queue = TaskQueue()
