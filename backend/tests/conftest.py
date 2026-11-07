"""Shared pytest fixtures."""

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client() -> Iterator[TestClient]:
    """HTTP client bound to the app; the context manager runs startup and shutdown."""
    with TestClient(app) as test_client:
        yield test_client
