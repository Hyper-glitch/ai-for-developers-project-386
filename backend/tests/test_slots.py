"""Guests can open a published type directly through its catalog URL."""

import pytest
from fastapi.testclient import TestClient
from pydantic import TypeAdapter

from app.generated.models import Error, MeetingType, Slot


def test_guest_reads_published_type(client: TestClient, published_types: list[MeetingType]) -> None:
    meeting_type = published_types[0]

    response = client.get(f"/meeting-types/{meeting_type.id}")

    assert response.status_code == 200
    assert MeetingType.model_validate(response.json()) == meeting_type


@pytest.mark.parametrize("suffix", ["", "/slots"])
@pytest.mark.parametrize("identifier", ["not-a-uuid", "00000000-0000-0000-0000-000000000000"])
def test_missing_type_returns_error(client: TestClient, identifier: str, suffix: str) -> None:
    response = client.get(f"/meeting-types/{identifier}{suffix}")

    assert response.status_code == 404
    assert Error.model_validate(response.json()).code == "meeting_type_not_found"


def test_slots_cover_booking_window(client: TestClient, published_types: list[MeetingType]) -> None:
    response = client.get(f"/meeting-types/{published_types[0].id}/slots")

    assert response.status_code == 200
    slots = TypeAdapter(list[Slot]).validate_python(response.json())
    assert response.json()[0] == {
        "startAt": "2026-11-03T09:15:00Z",
        "endAt": "2026-11-03T10:00:00Z",
    }
    assert response.json()[-1] == {
        "startAt": "2026-11-16T14:15:00Z",
        "endAt": "2026-11-16T15:00:00Z",
    }
    assert len(slots) == 21 + 9 * 34
    assert [s.startAt for s in slots] == sorted({s.startAt for s in slots})
