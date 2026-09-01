import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import analyses, content, internal, sessions
from app.api.v1.deps import build_provider
from app.content.registry import load_registry
from app.core.errors import (
    ApiError,
    api_error_handler,
    request_validation_handler,
    unhandled_error_handler,
)
from app.core.logging import configure_logging, log_event
from app.core.settings import get_settings
from app.db.engine import dispose_engine, get_engine

logger = logging.getLogger(__name__)

API_PREFIX = "/api/v1"


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    configure_logging(settings.log_level)

    # Content is loaded and parity-checked once, at startup: a broken or
    # half-translated content tree fails the boot instead of failing a user.
    registry = load_registry()
    provider = build_provider()
    get_engine()

    log_event(
        logger,
        "startup_completed",
        environment=settings.environment,
        ai_provider=provider.name,
        categories=len(registry.category_keys()),
    )
    yield
    await dispose_engine()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="RESQ API",
        version="1.0.0",
        lifespan=lifespan,
        docs_url="/docs",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origin_list,
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["X-Session-Token", "X-Internal-Secret", "Content-Type"],
        expose_headers=["X-RESQ-Degraded", "X-RateLimit-Remaining"],
    )

    app.add_exception_handler(ApiError, api_error_handler)
    app.add_exception_handler(RequestValidationError, request_validation_handler)
    app.add_exception_handler(Exception, unhandled_error_handler)

    app.include_router(sessions.router, prefix=API_PREFIX)
    app.include_router(content.router, prefix=API_PREFIX)
    app.include_router(analyses.router, prefix=API_PREFIX)
    app.include_router(internal.router, prefix=API_PREFIX)
    return app


app = create_app()
