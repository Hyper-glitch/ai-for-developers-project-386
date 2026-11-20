"""Isolated catalog and example meeting types for HTTP tests."""

from collections.abc import Iterator
from uuid import UUID

import pytest

from app.generated.models import MeetingType
from app.main import app
from app.store import Store, get_store


@pytest.fixture(autouse=True)
def store() -> Iterator[Store]:
    """Give each test an empty catalog."""
    catalog = Store()
    app.dependency_overrides[get_store] = lambda: catalog
    try:
        yield catalog
    finally:
        del app.dependency_overrides[get_store]


@pytest.fixture
def published_types(store: Store) -> list[MeetingType]:
    """Publish two types in a different order from title and ID sorting."""
    types = [
        MeetingType(id=UUID(int=2), title="Review", description="Feedback", durationMinutes=45),
        MeetingType(id=UUID(int=1), title="Intro", description="", durationMinutes=15),
    ]
    store.meeting_types.update((item.id, item) for item in types)
    return types
