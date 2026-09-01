"""Error contract: the API returns machine codes only.

All user-facing wording lives in the frontend message files, so that every
error exists in both English and Hindi. The backend never writes a sentence
a user reads.
"""
from typing import Any, Optional

from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class ErrorCode:
    VALIDATION_ERROR = "VALIDATION_ERROR"
    SESSION_INVALID = "SESSION_INVALID"
    RATE_LIMITED = "RATE_LIMITED"
    IMAGE_REJECTED = "IMAGE_REJECTED"
    NOT_FOUND = "NOT_FOUND"
    INTERNAL_ERROR = "INTERNAL_ERROR"


class ApiError(Exception):
    def __init__(
        self,
        code: str,
        status_code: int,
        detail: Optional[dict[str, Any]] = None,
    ) -> None:
        super().__init__(code)
        self.code = code
        self.status_code = status_code
        self.detail = detail or {}


class ValidationError(ApiError):
    def __init__(self, fields: Optional[Any] = None) -> None:
        super().__init__(
            ErrorCode.VALIDATION_ERROR,
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            {"fields": fields} if fields is not None else None,
        )


class SessionInvalidError(ApiError):
    def __init__(self) -> None:
        super().__init__(ErrorCode.SESSION_INVALID, status.HTTP_401_UNAUTHORIZED)


class RateLimitedError(ApiError):
    def __init__(self, retry_after_seconds: int) -> None:
        super().__init__(
            ErrorCode.RATE_LIMITED,
            status.HTTP_429_TOO_MANY_REQUESTS,
            {"retry_after_seconds": retry_after_seconds},
        )


class ImageRejectedError(ApiError):
    def __init__(self, reason: str) -> None:
        super().__init__(
            ErrorCode.IMAGE_REJECTED,
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            {"reason": reason},
        )


class NotFoundError(ApiError):
    def __init__(self) -> None:
        super().__init__(ErrorCode.NOT_FOUND, status.HTTP_404_NOT_FOUND)


def _payload(code: str, detail: dict[str, Any]) -> dict[str, Any]:
    return {"error": dict({"code": code}, **detail)}


async def api_error_handler(_: Request, exc: ApiError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code, content=_payload(exc.code, exc.detail)
    )


async def request_validation_handler(
    _: Request, exc: RequestValidationError
) -> JSONResponse:
    fields = [
        {"loc": [str(part) for part in err.get("loc", [])], "msg": err.get("msg", "")}
        for err in exc.errors()
    ]
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=_payload(ErrorCode.VALIDATION_ERROR, {"fields": fields}),
    )


async def unhandled_error_handler(_: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=_payload(ErrorCode.INTERNAL_ERROR, {}),
    )
