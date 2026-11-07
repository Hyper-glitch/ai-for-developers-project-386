"""FastAPI application entry point.

Routes follow the TypeSpec contract in ``typespec/main.tsp``; request and
response models come from ``app/generated``, which is regenerated from the
OpenAPI spec with ``mise run gen`` and must not be edited by hand.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.generated.models import Health, Status

app = FastAPI(title="Booking API")

# The Vite dev server runs on a different origin during local development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", operation_id="System_health", tags=["system"])
def health() -> Health:
    """Report that the service is up."""
    return Health(status=Status.ok)
