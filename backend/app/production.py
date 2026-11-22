"""Serve the compiled React application and the booking API on one port."""

from pathlib import Path

from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.main import app

PUBLIC = Path(__file__).resolve().parents[1] / "public"
app.mount("/assets", StaticFiles(directory=PUBLIC / "assets"), name="assets")


@app.get("/favicon.svg", include_in_schema=False)
def favicon() -> FileResponse:
    return FileResponse(PUBLIC / "favicon.svg")


@app.get("/{path:path}", include_in_schema=False)
def frontend() -> FileResponse:
    """Let React Router resolve direct links to guest and owner pages."""
    return FileResponse(PUBLIC / "index.html")
