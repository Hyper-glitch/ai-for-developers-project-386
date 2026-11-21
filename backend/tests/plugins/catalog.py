"""Isolated catalog and example meeting types for HTTP tests."""

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

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
def published_types(client: TestClient) -> list[MeetingType]:
    """Publish duplicate titles through the same endpoint as the owner."""
    types = []
    for duration in (45, 15):
        response = client.post(
            "/meeting-types",
            json={"title": "Intro", "description": "", "durationMinutes": duration},
        )
        assert response.status_code == 201
        types.append(MeetingType.model_validate(response.json()))
    assert types[0].id != types[1].id
    return types
