"""Guest access to the meeting type catalog."""

from fastapi.testclient import TestClient

from app.generated.models import MeetingType


def test_empty_catalog(client: TestClient) -> None:
    response = client.get("/meeting-types")
    assert response.status_code == 200
    assert response.json() == []


def test_catalog_preserves_creation_order(
    client: TestClient, published_types: list[MeetingType]
) -> None:
    response = client.get("/meeting-types")
    assert response.status_code == 200
    assert [MeetingType.model_validate(item) for item in response.json()] == published_types
