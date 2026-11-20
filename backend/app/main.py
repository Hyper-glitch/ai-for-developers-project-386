"""FastAPI application entry point.

Routes follow the TypeSpec contract in ``typespec/main.tsp``; request and
response models come from ``app/generated``, which is regenerated from the
OpenAPI spec with ``mise run gen`` and must not be edited by hand.
"""

import os
from typing import Annotated
from uuid import uuid4

from fastapi import Depends, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ConfigDict

from app.bookings import router as bookings_router
from app.generated.models import (
    Code,
    CreateMeetingType,
    Error,
    FieldError,
    Health,
    MeetingType,
    Status,
)
from app.slots import MeetingTypeNotFoundError
from app.slots import router as slots_router
from app.store import Store, get_store

app = FastAPI(title="Booking API")

# The Vite dev server runs on a different origin during local development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
        ).split(",")
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", operation_id="System_health", tags=["system"])
def health() -> Health:
    """Report that the service is up."""
    return Health(status=Status.ok)


@app.get("/meeting-types", operation_id="MeetingTypes_list", tags=["meeting-types"])
def list_meeting_types(store: Annotated[Store, Depends(get_store)]) -> list[MeetingType]:
    """Show the catalog in the order the owner created the types."""
    return list(store.meeting_types.values())


class MeetingTypeInput(CreateMeetingType):
    """Trim user-entered text before checking the contract's length limits."""

    model_config = ConfigDict(str_strip_whitespace=True)


@app.post(
    "/meeting-types",
    operation_id="MeetingTypes_create",
    tags=["meeting-types"],
    status_code=201,
    responses={422: {"model": Error}},
)
def create_meeting_type(
    body: MeetingTypeInput, store: Annotated[Store, Depends(get_store)]
) -> MeetingType:
    """Publish a new type even when another type has the same title."""
    item = MeetingType(id=uuid4(), **body.model_dump())
    store.meeting_types[item.id] = item
    return item


@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Let clients place each validation message beside the submitted JSON field."""
    fields = []
    for issue in exc.errors():
        location = issue["loc"]
        name = location[1] if len(location) > 1 and isinstance(location[1], str) else ""
        fields.append(FieldError(field=name, message=issue["msg"]))
    error = Error(code=Code.validation_error, message="Invalid request", fields=fields)
    return JSONResponse(status_code=422, content=error.model_dump(exclude_none=True))


@app.exception_handler(MeetingTypeNotFoundError)
async def missing_meeting_type(request: Request, exc: MeetingTypeNotFoundError) -> JSONResponse:
    error = Error(code=Code.meeting_type_not_found, message="Meeting type not found")
    return JSONResponse(status_code=404, content=error.model_dump(exclude_none=True))


app.include_router(slots_router)
app.include_router(bookings_router)
