from __future__ import annotations

import json
import os
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles


ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = Path(os.getenv("STUDIO_MANIFEST", ROOT / "studio.json"))
STATIC_DIR = Path(os.getenv("STATIC_DIR", ROOT / "web" / "dist"))
DATA_DIR = Path(os.getenv("DATA_DIR", ROOT / "data"))


def load_manifest() -> dict[str, Any]:
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))


manifest = load_manifest()
app = FastAPI(
    title=manifest["displayName"],
    version=manifest["version"],
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


def data_directory_status() -> tuple[bool, str]:
    try:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        probe = DATA_DIR / ".write-probe"
        probe.write_text("ready", encoding="utf-8")
        probe.unlink(missing_ok=True)
    except OSError as exc:
        return False, str(exc)
    return True, str(DATA_DIR)


@app.get("/api/health")
def health() -> JSONResponse:
    writable, detail = data_directory_status()
    payload = {
        "status": "ready" if writable else "degraded",
        "service": manifest["slug"],
        "version": manifest["version"],
        "checks": {"dataDirectory": {"ok": writable, "detail": detail}},
        "timestamp": datetime.now(UTC).isoformat(),
    }
    return JSONResponse(payload, status_code=200 if writable else 503)


@app.get("/api/version")
def version() -> dict[str, Any]:
    return {
        "displayName": manifest["displayName"],
        "repository": manifest["repository"],
        "slug": manifest["slug"],
        "version": manifest["version"],
        "license": manifest["license"],
    }


@app.post("/api/preflight")
def preflight() -> dict[str, Any]:
    writable, data_detail = data_directory_status()
    static_ready = (STATIC_DIR / "index.html").exists()
    checks = [
        {"id": "manifest", "label": "studio.json loaded", "ok": True, "detail": manifest["repository"]},
        {"id": "storage", "label": "Persistent data path writable", "ok": writable, "detail": data_detail},
        {
            "id": "web",
            "label": "Production web artifact present",
            "ok": static_ready,
            "detail": str(STATIC_DIR / "index.html"),
        },
        {
            "id": "identity",
            "label": "Release identity aligned",
            "ok": manifest["container"].endswith("/" + manifest["slug"]),
            "detail": manifest["container"],
        },
    ]
    return {
        "status": "pass" if all(item["ok"] for item in checks) else "review",
        "checks": checks,
        "ranAt": datetime.now(UTC).isoformat(),
    }


if (STATIC_DIR / "assets").exists():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")
if (STATIC_DIR / "brand").exists():
    app.mount("/brand", StaticFiles(directory=STATIC_DIR / "brand"), name="brand")


@app.get("/{path:path}", response_model=None)
def spa(path: str) -> FileResponse | JSONResponse:
    index = STATIC_DIR / "index.html"
    requested = (STATIC_DIR / path).resolve()
    if path and requested.is_relative_to(STATIC_DIR.resolve()) and requested.is_file():
        return FileResponse(requested)
    if index.exists():
        return FileResponse(index)
    return JSONResponse(
        {
            "message": "API is running. Start Vite for development or build web/dist for the combined app.",
            "health": manifest["healthEndpoint"],
        }
    )
