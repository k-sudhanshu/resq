"""Fixed-window in-memory rate limiting.

Per-process and therefore reset when the free instance sleeps or redeploys.
That is an accepted limitation: the durable backstop against draining the AI
quota is the Postgres-backed daily budget in `services/quota_service.py`.
"""
import time
from threading import Lock


class FixedWindowLimiter:
    def __init__(self, limit: int, window_seconds: int) -> None:
        self.limit = limit
        self.window_seconds = window_seconds
        self._hits: dict[str, tuple[int, float]] = {}
        self._lock = Lock()

    def check(self, key: str) -> tuple[bool, int, int]:
        """Record a hit. Returns (allowed, remaining, retry_after_seconds)."""
        now = time.monotonic()
        with self._lock:
            count, window_start = self._hits.get(key, (0, now))
            if now - window_start >= self.window_seconds:
                count, window_start = 0, now

            if count >= self.limit:
                retry_after = int(self.window_seconds - (now - window_start)) + 1
                self._hits[key] = (count, window_start)
                return False, 0, retry_after

            count += 1
            self._hits[key] = (count, window_start)
            return True, self.limit - count, 0

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()
