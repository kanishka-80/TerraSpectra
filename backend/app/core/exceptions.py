from fastapi import Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from backend.app.schemas.common import ErrorResponse


async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
):
    error = ErrorResponse(
        status="error",
        message="Request validation failed.",
        code="VALIDATION_ERROR",
    )

    return JSONResponse(
        status_code=422,
        content={
            **error.model_dump(),
            "details": jsonable_encoder(exc.errors()),
        },
    )


async def http_exception_handler(
    request: Request,
    exc: StarletteHTTPException,
):
    error = ErrorResponse(
        status="error",
        message=str(exc.detail),
        code=f"HTTP_{exc.status_code}",
    )

    return JSONResponse(
        status_code=exc.status_code,
        content=error.model_dump(),
        headers=exc.headers,
    )


async def global_exception_handler(
    request: Request,
    exc: Exception,
):
    error = ErrorResponse(
        status="error",
        message="An unexpected server error occurred.",
        code="INTERNAL_SERVER_ERROR",
    )

    return JSONResponse(
        status_code=500,
        content=error.model_dump(),
    )
