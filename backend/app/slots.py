"""Public meeting type details and availability."""

from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Request

from app.generated.models import Error, MeetingType, Slot
from app.schedule import get_now, scheduled_slots
from app.store import Store, get_store

router = APIRouter(tags=["meeting-types"], responses={404: {"model": Error}})
# Both malformed and unknown IDs mean the public link is unavailable (404).
path_schema = {
    "parameters": [
        {
            "in": "path",
            "name": "id",
            "required": True,
            "schema": {"type": "string", "format": "uuid"},
        }
    ]
}


class MeetingTypeNotFoundError(Exception):
    """The public link does not identify a published meeting type."""


def find_meeting_type(request: Request, store: Annotated[Store, Depends(get_store)]) -> MeetingType:
    try:
        return store.meeting_types[UUID(request.path_params["id"])]
    except (ValueError, KeyError) as exc:
        raise MeetingTypeNotFoundError from exc


@router.get("/meeting-types/{id}", operation_id="MeetingTypes_get", openapi_extra=path_schema)
def get_meeting_type(item: Annotated[MeetingType, Depends(find_meeting_type)]) -> MeetingType:
    return item


@router.get(
    "/meeting-types/{id}/slots", operation_id="MeetingTypes_slots", openapi_extra=path_schema
)
def list_slots(
    item: Annotated[MeetingType, Depends(find_meeting_type)],
    now: Annotated[datetime, Depends(get_now)],
) -> list[Slot]:
    return list(scheduled_slots(item.durationMinutes.value, now))
