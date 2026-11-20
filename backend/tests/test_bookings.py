"""Guest booking through the public HTTP contract."""

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from threading import Barrier

import pytest
from fastapi.testclient import TestClient

from app.generated.models import Booking, Error, MeetingType, Slot
from app.main import app
from app.schedule import get_now
from app.store import Store


def test_booking_computes_utc_end(client: TestClient, booking_request: dict[str, str]) -> None:
    response = client.post("/bookings", json=booking_request | {"endAt": "2000-01-01T00:00:00Z"})
    assert response.status_code == 201
    result = Booking.model_validate(response.json())
    assert result.guestName == "Ada"
    assert result.guestEmail == "ada@example.com"
    assert response.json()["startAt"] == "2026-11-03T10:00:00Z"
    assert response.json()["endAt"] == "2026-11-03T10:45:00Z"


@pytest.mark.parametrize(
    ("start", "reason"),
    [
        ("2026-11-03T09:00:00Z", "past"),
        ("2026-11-17T00:01:00Z", "outside_window"),
        ("2026-11-07T09:01:00Z", "off_grid"),
        ("2026-11-07T09:00:00Z", "outside_working_hours"),
        ("2026-11-03T14:30:00Z", "outside_working_hours"),
    ],
)
def test_unavailable_returns_first_reason(
    client: TestClient, booking_request: dict[str, str], start: str, reason: str
) -> None:
    response = client.post("/bookings", json=booking_request | {"startAt": start})
    error = Error.model_validate(response.json())
    assert (response.status_code, error.code, error.reason) == (422, "slot_unavailable", reason)


@pytest.mark.parametrize("start", ["2026-11-03T13:00:00", 1793703600, "1793703600"])
def test_validation_precedes_type_lookup(
    client: TestClient, booking_request: dict[str, str], start: str | int
) -> None:
    response = client.post(
        "/bookings",
        json=booking_request
        | {"meetingTypeId": "invalid", "guestName": " ", "guestEmail": "bad", "startAt": start},
    )
    error = Error.model_validate(response.json())
    assert (response.status_code, error.code) == (422, "validation_error")
    assert error.fields and {item.field for item in error.fields} == {
        "meetingTypeId",
        "guestName",
        "guestEmail",
        "startAt",
    }


def test_missing_type_precedes_schedule(
    client: TestClient, booking_request: dict[str, str]
) -> None:
    response = client.post(
        "/bookings",
        json=booking_request
        | {
            "meetingTypeId": "00000000-0000-0000-0000-000000000000",
            "startAt": "2000-01-01T00:00:00Z",
        },
    )
    assert (response.status_code, Error.model_validate(response.json()).code) == (
        404,
        "meeting_type_not_found",
    )


def test_concurrent_requests_choose_one_guest(
    client: TestClient, booking_request: dict[str, str]
) -> None:
    barrier = Barrier(8)

    def submit(guest: int) -> tuple[int, str]:
        barrier.wait(timeout=5)
        response = client.post("/bookings", json=booking_request | {"guestName": str(guest)})
        if response.status_code == 201:
            return 201, Booking.model_validate(response.json()).guestName
        return response.status_code, Error.model_validate(response.json()).code

    with ThreadPoolExecutor(max_workers=8) as pool:
        outcomes = list(pool.map(submit, range(8)))
    assert [status for status, _ in outcomes].count(201) == 1
    assert outcomes.count((409, "conflict")) == 7


def test_overlap_across_meeting_types(
    client: TestClient, booking_request: dict[str, str], published_types: list[MeetingType]
) -> None:
    assert client.post("/bookings", json=booking_request).status_code == 201
    other = str(published_types[1].id)
    slots = client.get(f"/meeting-types/{other}/slots")
    starts = {Slot.model_validate(row).startAt.isoformat() for row in slots.json()}
    assert "2026-11-03T10:15:00+00:00" not in starts
    assert "2026-11-03T09:45:00+00:00" in starts
    assert "2026-11-03T10:45:00+00:00" in starts
    for start, expected in [("10:15", 409), ("09:45", 201), ("10:45", 201)]:
        response = client.post(
            "/bookings",
            json=booking_request | {"meetingTypeId": other, "startAt": f"2026-11-03T{start}:00Z"},
        )
        assert response.status_code == expected


def test_store_accepts_one_contender(store: Store, booking_request: dict[str, str]) -> None:
    booking = Booking.model_validate(
        booking_request
        | {"id": "00000000-0000-0000-0000-000000000001", "endAt": "2026-11-03T10:45:00Z"}
    )
    barrier = Barrier(8)

    def reserve(_: int) -> bool:
        barrier.wait(timeout=5)
        return store.reserve(booking)

    with ThreadPoolExecutor(max_workers=8) as pool:
        outcomes = list(pool.map(reserve, range(8)))
    assert outcomes.count(True) == 1
    assert len(store.bookings()) == 1


@pytest.mark.parametrize("raw", ["{", "[]", '"invalid"'])
def test_bad_body_has_unnamed_field(client: TestClient, raw: str) -> None:
    response = client.post("/bookings", content=raw, headers={"content-type": "application/json"})
    error = Error.model_validate(response.json())
    assert (response.status_code, error.code) == (422, "validation_error")
    assert error.fields and [item.field for item in error.fields] == [""]


def test_past_precedes_occupied_slot(client: TestClient, booking_request: dict[str, str]) -> None:
    response = client.post("/bookings", json=booking_request)
    assert response.status_code == 201
    app.dependency_overrides[get_now] = lambda: datetime.fromisoformat("2026-11-03T10:05:00Z")
    response = client.post("/bookings", json=booking_request)
    error = Error.model_validate(response.json())
    assert (response.status_code, error.code, error.reason) == (422, "slot_unavailable", "past")
    response = client.post("/bookings", json=booking_request | {"startAt": "2026-11-03T10:15:00Z"})
    assert (response.status_code, Error.model_validate(response.json()).code) == (409, "conflict")
