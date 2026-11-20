"""Guest access to the meeting type catalog."""

import pytest
from fastapi.testclient import TestClient

from app.generated.models import Error, MeetingType


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


def test_create_trims_meeting_type(client: TestClient) -> None:
    response = client.post(
        "/meeting-types", json={"title": " Intro ", "description": " Hello ", "durationMinutes": 30}
    )
    assert response.status_code == 201
    created = MeetingType.model_validate(response.json())
    assert (created.title, created.description, created.durationMinutes.value) == (
        "Intro",
        "Hello",
        30,
    )
    assert "location" not in response.headers


@pytest.mark.parametrize(
    ("body", "invalid"),
    [
        ({}, {"title", "description", "durationMinutes"}),
        (
            {"title": " ", "description": "x" * 1001, "durationMinutes": 16},
            {"title", "description", "durationMinutes"},
        ),
        (
            {"title": "x" * 101, "description": "", "durationMinutes": "15"},
            {"title", "durationMinutes"},
        ),
        ([], {""}),
        (None, {""}),
    ],
)
def test_reports_invalid_fields(client: TestClient, body: object, invalid: set[str]) -> None:
    response = client.post("/meeting-types", json=body)
    assert response.status_code == 422
    error = Error.model_validate(response.json())
    assert error.code == "validation_error"
    assert error.fields and {item.field for item in error.fields} == invalid
    assert all(item.message for item in error.fields)


def test_malformed_json_body(client: TestClient) -> None:
    response = client.post(
        "/meeting-types", content="{", headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 422
    error = Error.model_validate(response.json())
    assert error.code == "validation_error"
    assert error.fields and [item.field for item in error.fields] == [""]
