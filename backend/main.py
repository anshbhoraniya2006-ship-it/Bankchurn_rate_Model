"""
main.py
=======
FastAPI application entry point for the Bank Churn Prediction API.

Architecture:
  - Lifespan context manager loads the model once at startup
  - ChurnPredictor singleton stored in app.state for dependency injection
  - Routers are registered with clean prefixes
  - CORS enabled for local development (restrict origins in production)

Run:
  # From the project root (D:/Bank churnrate/):
  uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
"""

from __future__ import annotations

import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from backend.config import (
    ALLOWED_ORIGINS,
    APP_DESCRIPTION,
    APP_TITLE,
    APP_VERSION,
    BASE_DIR,
    CONTACT,
    TAGS_METADATA,
)
from backend.routers import health as health_router
from backend.routers import predict as predict_router
from backend.services.predictor import predictor

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s — %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)


# ─── Lifespan (startup / shutdown) ────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Load the ChurnPredictor (Keras model + artifacts) once at startup
    and make it available through app.state for all request handlers.
    """
    import asyncio

    logger.info("=" * 55)
    logger.info("  [START] Bank Churn Prediction API — Starting up")
    logger.info("=" * 55)

    app.state.predictor = predictor

    try:
        await asyncio.to_thread(predictor.load)
        logger.info("[OK] ChurnPredictor ready.")
    except Exception as exc:
        logger.error("[ERROR] Failed to load model: %s", exc, exc_info=True)
        logger.warning(
            "API will start but /predict endpoints will return 503 until artifacts are present."
        )

    yield  # Application runs here

    logger.info("[STOP] Bank Churn Prediction API — Shutting down")


# ─── FastAPI App ──────────────────────────────────────────────────────────────
app = FastAPI(
    title=APP_TITLE,
    description=APP_DESCRIPTION,
    version=APP_VERSION,
    contact=CONTACT,
    openapi_tags=TAGS_METADATA,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# ─── CORS Middleware ───────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(predict_router.router)
app.include_router(health_router.router)

# ─── Static Frontend Mount & SPA Fallback ──────────────────────────────────────
dist_dir = BASE_DIR / "frontend" / "dist"
if dist_dir.exists():
    if (dist_dir / "assets").exists():
        app.mount("/assets", StaticFiles(directory=dist_dir / "assets"), name="static_assets")
    app.mount("/app", StaticFiles(directory=dist_dir, html=True), name="static_frontend")

    @app.get("/app/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        """SPA fallback handler to support client-side routing on refresh."""
        file_path = dist_dir / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(dist_dir / "index.html")

# ─── Root Redirect ────────────────────────────────────────────────────────────
@app.get("/", include_in_schema=False)
async def root() -> RedirectResponse:
    """Redirect root to UI if built, else API docs."""
    if dist_dir.exists():
        return RedirectResponse(url="/app/")
    return RedirectResponse(url="/docs")


# ─── Dev entry point ──────────────────────────────────────────────────────────
if __name__ == "__main__":
    import os
    import uvicorn

    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level="info",
    )

