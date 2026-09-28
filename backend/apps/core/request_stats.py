"""
Per-request query counter.

Works without DEBUG=True (so it can run in production). Installs as a
thin wrapper around Django's CursorWrapper to count queries and sum
their wall-clock time.

Used by `apps.core.middleware.RequestTimingMiddleware` to log a single
`[request_timing]` line per request.
"""
import time


class RequestQueryStats:
    def __init__(self):
        self.count = 0
        self.elapsed_ms = 0.0
        self._old_execute = None
        self._old_executemany = None

    def install(self):
        from django.db import connection

        wrapper = connection.ops.__class__  # ensure wrapper class is loaded
        # Patch the CursorWrapper class — every new cursor uses it.
        from django.db.backends.utils import CursorWrapper

        self._old_execute = CursorWrapper.execute
        self._old_executemany = CursorWrapper.executemany

        stats = self

        def _timed_execute(self, sql, params=None):
            t0 = time.perf_counter()
            try:
                return stats._old_execute(self, sql, params)
            finally:
                stats.count += 1
                stats.elapsed_ms += (time.perf_counter() - t0) * 1000.0

        def _timed_executemany(self, sql, param_list):
            t0 = time.perf_counter()
            try:
                return stats._old_executemany(self, sql, param_list)
            finally:
                stats.count += 1
                stats.elapsed_ms += (time.perf_counter() - t0) * 1000.0

        CursorWrapper.execute = _timed_execute
        CursorWrapper.executemany = _timed_executemany

    def uninstall(self):
        from django.db.backends.utils import CursorWrapper

        if self._old_execute is not None:
            CursorWrapper.execute = self._old_execute
        if self._old_executemany is not None:
            CursorWrapper.executemany = self._old_executemany
        self._old_execute = None
        self._old_executemany = None
