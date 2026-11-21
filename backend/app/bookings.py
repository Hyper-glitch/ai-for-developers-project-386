"""Create bookings against the owner's shared schedule."""

import re
from datetime import UTC, datetime, timedelta
from typing import Annotated, Self
from uuid import uuid4

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import (
    ConfigDict,
    ModelWrapValidatorHandler,
    PrivateAttr,
    field_validator,
    model_validator,
)

from app.generated.models import Booking, Code, CreateBooking, Error, Reason
from app.schedule import get_now, unavailable_reason
from app.slots import MeetingTypeNotFoundError
from app.store import Store, get_store

router = APIRouter(tags=["bookings"])


class BookingInput(CreateBooking):
    """Normalize contact details before checking their constraints."""

    model_config = ConfigDict(str_strip_whitespace=True)
    _submicrosecond: bool = PrivateAttr(default=False)

    @field_validator("startAt", mode="before")
    @classmethod
    def require_timestamp_string(cls, raw: object) -> str:
        """Epoch numbers carry no explicit UTC offset."""
        if not isinstance(raw, str) or ":" not in raw:
            raise ValueError("Expected an ISO timestamp with a UTC offset")
        return raw

    @model_validator(mode="wrap")
    @classmethod
    def preserve_fraction(cls, raw: object, handler: ModelWrapValidatorHandler[Self]) -> Self:
        """Keep any nonzero digits discarded by datetime's microsecond precision."""
        body = handler(raw)
        if isinstance(raw, dict) and isinstance(start := raw.get("startAt"), str):
            body._submicrosecond = re.search(r"[.,][0-9]{6}[0-9]*[1-9]", start) is not None
        return body

    def unavailable_reason(self, minutes: int, now: datetime) -> Reason | None:
        """Apply the schedule to the full precision supplied by the guest."""
        return unavailable_reason(self.startAt, minutes, now, submicrosecond=self._submicrosecond)


@router.post(
    "/bookings",
    operation_id="Bookings_create",
    status_code=201,
    response_model=Booking,
    responses={code: {"model": Error} for code in (404, 409, 422)},
)
def create_booking(
    body: BookingInput,
    store: Annotated[Store, Depends(get_store)],
    now: Annotated[datetime, Depends(get_now)],
) -> Booking | JSONResponse:
    """Reserve the published duration on the owner's shared schedule."""
    try:
        item = store.meeting_types[body.meetingTypeId]
    except KeyError as exc:
        raise MeetingTypeNotFoundError from exc
    if reason := body.unavailable_reason(item.durationMinutes.value, now):
        error = Error(code=Code.slot_unavailable, message="Slot unavailable", reason=reason)
        return JSONResponse(status_code=422, content=error.model_dump(exclude_none=True))
    start = body.startAt.astimezone(UTC)
    booking = Booking(
        **body.model_dump(exclude={"startAt"}),
        id=uuid4(),
        startAt=start,
        endAt=start + timedelta(minutes=item.durationMinutes.value),
    )
    if not store.reserve(booking):
        error = Error(code=Code.conflict, message="Slot already booked")
        return JSONResponse(status_code=409, content=error.model_dump(exclude_none=True))
    return booking


@router.get("/bookings", operation_id="Bookings_list")
def list_bookings(
    store: Annotated[Store, Depends(get_store)],
    now: Annotated[datetime, Depends(get_now)],
) -> list[Booking]:
    """Include ongoing meetings until the instant they end."""
    return sorted(
        (booking for booking in store.bookings() if booking.endAt > now),
        key=lambda booking: booking.startAt,
    )
