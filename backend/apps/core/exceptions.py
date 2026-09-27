"""
Central error handling.

Every non-2xx API response is normalized into a single envelope:

    {
        "error": {
            "code": "VALIDATION_ERROR",
            "message": "human readable summary",
            "details": {"field_name": ["reason", ...], ...}   # optional
        }
    }

This keeps the frontend's error handling in one place instead of guessing
DRF's default shape (which varies between plain strings, lists, and dicts).
"""
import logging
import uuid

from django.conf import settings
from django.core.exceptions import PermissionDenied
from django.http import Http404
from rest_framework import status
from rest_framework.exceptions import (
    APIException,
    AuthenticationFailed,
    NotAuthenticated,
    PermissionDenied as DRFPermissionDenied,
    Throttled,
    ValidationError,
)
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

logger = logging.getLogger("apps")

# Maps an HTTP status code to a stable machine-readable error code.
_STATUS_CODE_MAP = {
    400: "VALIDATION_ERROR",
    401: "NOT_AUTHENTICATED",
    403: "PERMISSION_DENIED",
    404: "NOT_FOUND",
    405: "METHOD_NOT_ALLOWED",
    409: "CONFLICT",
    429: "THROTTLED",
    500: "SERVER_ERROR",
}


class ConflictError(APIException):
    """Raise this for valid requests that conflict with current state
    (out-of-stock at checkout, invalid order-status transition, a coupon
    already redeemed, etc). Maps to HTTP 409."""

    status_code = status.HTTP_409_CONFLICT
    default_detail = "The request conflicts with the current state of the resource."
    default_code = "conflict"


def custom_exception_handler(exc, context):
    # Translate a couple of Django-native exceptions into DRF ones so they
    # flow through the same envelope instead of Django's default HTML/500.
    if isinstance(exc, Http404):
        from rest_framework.exceptions import NotFound

        exc = NotFound()
    elif isinstance(exc, PermissionDenied):
        exc = DRFPermissionDenied()

    response = drf_exception_handler(exc, context)

    request = context.get("request")
    user_id = getattr(getattr(request, "user", None), "id", None)

    if response is None:
        # Unhandled exception -> 500. Never leak internals to the client.
        request_id = uuid.uuid4().hex[:12]
        logger.exception(
            "Unhandled exception (request_id=%s, path=%s, user_id=%s)",
            request_id,
            getattr(request, "path", "?"),
            user_id,
        )
        body = {
            "error": {
                "code": "SERVER_ERROR",
                "message": "Something went wrong on our end. Please try again.",
                "details": {"request_id": request_id} if settings.DEBUG else None,
            }
        }
        return Response(body, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    code = _STATUS_CODE_MAP.get(response.status_code, "ERROR")
    details = None
    message = "An error occurred."

    if isinstance(exc, ValidationError):
        details = response.data
        message = "One or more fields are invalid."
    elif isinstance(exc, (AuthenticationFailed, NotAuthenticated)):
        message = "Authentication is required or has expired."
    elif isinstance(exc, Throttled):
        message = "Too many requests. Please slow down and try again shortly."
        details = {"retry_after_seconds": exc.wait}
    elif hasattr(exc, "detail"):
        message = str(exc.detail) if not isinstance(exc.detail, (list, dict)) else message
        if isinstance(exc.detail, dict):
            details = exc.detail

    logger.info(
        "API error (code=%s status=%s path=%s user_id=%s)",
        code,
        response.status_code,
        getattr(request, "path", "?"),
        user_id,
    )

    response.data = {"error": {"code": code, "message": message, "details": details}}
    return response
