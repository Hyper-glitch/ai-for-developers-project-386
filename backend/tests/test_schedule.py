"""Time boundaries use Moscow calendar dates regardless of the caller's offset."""

from datetime import datetime

import pytest

from app.schedule import unavailable_reason


@pytest.mark.parametrize(
    ("start", "minutes", "reason"),
    [
        ("2026-11-03T06:00:00Z", 30, "past"),
        ("2026-11-03T05:59:00Z", 30, "past"),
        ("2026-11-16T14:30:00Z", 30, None),
        ("2026-11-17T06:01:00Z", 30, "outside_window"),
        ("2026-11-07T06:01:00Z", 30, "off_grid"),
        ("2026-11-04T06:00:01Z", 30, "off_grid"),
        ("2026-11-04T06:00:00.000001Z", 30, "off_grid"),
        ("2026-11-07T06:00:00Z", 30, "outside_working_hours"),
        ("2026-11-08T06:00:00Z", 30, "outside_working_hours"),
        ("2026-11-04T05:45:00Z", 30, "outside_working_hours"),
        ("2026-11-04T06:00:00Z", 120, None),
        ("2026-11-04T14:45:00Z", 15, None),
        ("2026-11-04T14:45:00Z", 30, "outside_working_hours"),
        ("2026-11-04T22:00:00Z", 30, "outside_working_hours"),
    ],
)
def test_schedule_boundary(start: str, minutes: int, reason: str | None) -> None:
    now = datetime.fromisoformat("2026-11-03T06:00:00Z")

    assert unavailable_reason(datetime.fromisoformat(start), minutes, now) == reason


def test_window_uses_moscow_today() -> None:
    now = datetime.fromisoformat("2026-11-02T22:00:00Z")
    last_morning = datetime.fromisoformat("2026-11-16T06:00:00Z")

    assert unavailable_reason(last_morning, 15, now) is None
