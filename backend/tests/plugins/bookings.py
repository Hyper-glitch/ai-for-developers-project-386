"""Requests use a real published type and a fixed clock."""

import pytest

from app.generated.models import MeetingType


@pytest.fixture
def booking_request(published_types: list[MeetingType]) -> dict[str, str]:
    return {
        "meetingTypeId": str(published_types[0].id),
        "startAt": "2026-11-03T13:00:00+03:00",
        "guestName": "  Ada  ",
        "guestEmail": " ada@example.com ",
    }
