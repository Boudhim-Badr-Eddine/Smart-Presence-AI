"""Lightweight scheduler for recurring tasks (reports, cache purge, etc).
Uses simple threading; consider APScheduler or Celery for production.
"""
import threading
import time
from typing import Callable, Dict
from datetime import datetime, timedelta


class SimpleScheduler:
    def __init__(self):
        self._jobs: Dict[str, Dict] = {}
        self._running = False
        self._thread: threading.Thread | None = None

    def schedule(self, job_id: str, interval_seconds: int, func: Callable):
        self._jobs[job_id] = {"interval": interval_seconds, "func": func, "last_run": 0.0}

    def unschedule(self, job_id: str):
        self._jobs.pop(job_id, None)

    def start(self):
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()

    def stop(self):
        self._running = False
        if self._thread:
            self._thread.join(timeout=2)

    def _run_loop(self):
        while self._running:
            now = time.time()
            for job_id, job in list(self._jobs.items()):
                if now - job["last_run"] >= job["interval"]:
                    try:
                        job["func"]()
                    except Exception:
                        # log or handle errors in production
                        pass
                    job["last_run"] = now
            time.sleep(1)


scheduler = SimpleScheduler()
