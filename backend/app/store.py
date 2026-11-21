"""Process-local meeting types and bookings shared by API requests."""

from collections.abc import Iterable
from dataclasses import dataclass, field
from datetime import datetime
from functools import cache
from threading import Lock
from uuid import UUID

from app.generated.models import Booking, MeetingType


def overlaps(start: datetime, end: datetime, bookings: Iterable[Booking]) -> bool:
    """Allow adjacent meetings and reject every positive-length intersection."""
    return any(start < existing.endAt and existing.startAt < end for existing in bookings)


@dataclass
class Store:
    """Keep the owner's catalog and protect bookings across meeting types."""

    meeting_types: dict[UUID, MeetingType] = field(default_factory=dict)
    _bookings: list[Booking] = field(default_factory=list, init=False)
    _lock: Lock = field(default_factory=Lock, init=False)

    def reserve(self, booking: Booking) -> bool:
        """Check occupancy and insert under the same lock."""
        with self._lock:
            if overlaps(booking.startAt, booking.endAt, self._bookings):
                return False
            self._bookings.append(booking)
            return True

    def bookings(self) -> tuple[Booking, ...]:
        """Snapshot occupancy so slot generation can release the write lock."""
        with self._lock:
            return tuple(self._bookings)


@cache
def get_store() -> Store:
    """Use one store for the lifetime of the server process."""
    return Store()
