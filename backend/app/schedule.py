"""The owner's schedule uses Moscow dates, including the current local day."""

from collections.abc import Iterator
from datetime import UTC, datetime, time, timedelta
from zoneinfo import ZoneInfo

from app.generated.models import Reason, Slot

MOSCOW = ZoneInfo("Europe/Moscow")
WINDOW_DAYS = 14
GRID_MINUTES = 15
OPEN = time(9)
CLOSE = time(18)


def get_now() -> datetime:
    """Sample the clock once per request for a consistent booking window."""
    return datetime.now(UTC)


def unavailable_reason(
    start: datetime, minutes: int, now: datetime, *, submicrosecond: bool = False
) -> Reason | None:
    """Return the first applicable reason in booking validation order."""
    if start < now or (start == now and not submicrosecond):
        return Reason.past
    today = now.astimezone(MOSCOW).date()
    window_end = datetime.combine(today + timedelta(days=WINDOW_DAYS), time.min, MOSCOW)
    if start >= window_end:
        return Reason.outside_window
    local = start.astimezone(MOSCOW)
    if local.minute % GRID_MINUTES or local.second or local.microsecond or submicrosecond:
        return Reason.off_grid
    closing = datetime.combine(local.date(), CLOSE, MOSCOW)
    if local.weekday() >= 5 or local.time() < OPEN or local + timedelta(minutes=minutes) > closing:
        return Reason.outside_working_hours
    return None


def scheduled_slots(minutes: int, now: datetime) -> Iterator[Slot]:
    """Yield candidate slots in order, using the same rules as booking."""
    today = now.astimezone(MOSCOW).date()
    for offset in range(WINDOW_DAYS):
        day = today + timedelta(days=offset)
        start = datetime.combine(day, OPEN, MOSCOW)
        closing = datetime.combine(day, CLOSE, MOSCOW)
        while start < closing:
            if unavailable_reason(start, minutes, now) is None:
                utc_start = start.astimezone(UTC)
                yield Slot(startAt=utc_start, endAt=utc_start + timedelta(minutes=minutes))
            start += timedelta(minutes=GRID_MINUTES)
