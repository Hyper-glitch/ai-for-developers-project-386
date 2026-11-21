"""Process-local meeting types shared by API requests."""

from dataclasses import dataclass, field
from functools import cache
from uuid import UUID

from app.generated.models import MeetingType


@dataclass
class Store:
    """Keep the owner's meeting types in creation order."""

    meeting_types: dict[UUID, MeetingType] = field(default_factory=dict)


@cache
def get_store() -> Store:
    """Use one store for the lifetime of the server process."""
    return Store()
