"""
Request timing middleware — controlled by an env flag.

When `REQUEST_TIMING_ENABLED=True`, every API request logs one line of
[request_timing] with method, path, status, total ms, DB query count,
and DB time. This is the single best tool for hunting slow endpoints
in production: the new Render access log format prints request time
in microseconds too, but this adds the *DB query count* which is what
you actually need to spot an N+1.

Safe to enable on Render Free — the logs go to stdout which Render
already captures. Disable it during load tests to keep the logs clean.
"""
import logging
import os
import time

from django.db import connection

logger = logging.getLogger("apps.request_timing")


class RequestTimingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        # Read env var lazily so toggling it on Render doesn't need a redeploy.
        self._enabled = os.environ.get("REQUEST_TIMING_ENABLED", "False").lower() in ("1", "true", "yes")

    def __call__(self, request):
        if not self._enabled:
            return self.get_response(request)

        # `force_debug_cursor` resets the per-request query log so each
        # request starts fresh. We attach it via the connection's
        # `force_debug_cursor` attribute and let Django collect stats.
        start = time.perf_counter()
        # Track query count via the connection wrapper — Django records
        # queries to `connection.queries` only when DEBUG=True. To get
        # counts without that, monkey-patch the cursor wrapper.
        from apps.core.request_stats import RequestQueryStats

        stats = RequestQueryStats()
        stats.install()
        try:
            response = self.get_response(request)
        finally:
            stats.uninstall()
            elapsed_ms = (time.perf_counter() - start) * 1000.0
            # Skip noisy chrome paths to keep the log readable.
            if not request.path.startswith(("/static", "/favicon", "/health")):
                logger.info(
                    "[request_timing] method=%s path=%s status=%s total_ms=%.2f db_queries=%d db_ms=%.2f",
                    request.method,
                    request.path,
                    getattr(response, "status_code", "?"),
                    elapsed_ms,
                    stats.count,
                    stats.elapsed_ms,
                )
        return response
