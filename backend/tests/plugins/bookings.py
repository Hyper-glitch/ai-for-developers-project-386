"""Requests use a real published type and a fixed clock."""

from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from app.generated.models import Booking, MeetingType
from app.main import app
from app.schedule import get_now


@pytest.fixture
def booking_request(published_types: list[MeetingType]) -> dict[str, str]:
    return {
        "meetingTypeId": str(published_types[0].id),
        "startAt": "2026-11-03T13:00:00+03:00",
        "guestName": "  Ada  ",
        "guestEmail": " ada@example.com ",
    }


@pytest.fixture(params=["10:30", "10:35"], ids=["end-equals-now", "in-progress"])
def upcoming(
    request: pytest.FixtureRequest,
    client: TestClient,
    published_types: list[MeetingType],
    booking_request: dict[str, str],
) -> list[Booking]:
    """Advance the clock to and past the end of the earliest meeting."""
    bookings = []
    for start, item in (
        ("12:00", published_types[0]),
        ("10:15", published_types[1]),
        ("10:30", published_types[0]),
    ):
        response = client.post(
            "/bookings",
            json={
                **booking_request,
                "meetingTypeId": str(item.id),
                "startAt": f"2026-11-03T{start}:00Z",
            },
        )
        assert response.status_code == 201
        bookings.append(Booking.model_validate(response.json()))
    instant = datetime.fromisoformat(f"2026-11-03T{request.param}:00Z")
    app.dependency_overrides[get_now] = lambda: instant
    return [bookings[2], bookings[0]]
