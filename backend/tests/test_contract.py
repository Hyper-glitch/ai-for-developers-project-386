"""Verify both API descriptions expose the same operations and response statuses."""

from pathlib import Path
from typing import TypedDict

import pytest
import yaml  # type: ignore[import-untyped]
from fastapi.testclient import TestClient

from app.generated.models import Error


class Operation(TypedDict):
    responses: dict[str, object]


def test_routes_match_contract(client: TestClient) -> None:
    """SDK clients and the running API agree on routes, methods and status codes."""
    contract = yaml.safe_load((Path(__file__).parents[2] / "openapi/openapi.yaml").read_text())
    actual = client.get("/openapi.json").json()
    methods = {"get", "post", "put", "patch", "delete", "options", "head", "trace"}

    def responses(paths: dict[str, dict[str, Operation]]) -> set[tuple[str, str, str]]:
        return {
            (path, method, str(status))
            for path, operations in paths.items()
            for method, operation in operations.items()
            if method in methods
            for status in operation["responses"]
        }

    assert responses(actual["paths"]) == responses(contract["paths"])


@pytest.mark.parametrize("path", ["/bookings", "/meeting-types"])
def test_invalid_encoding_reports_body_error(client: TestClient, path: str) -> None:
    """Undecodable JSON gives clients the same body error as invalid syntax."""
    response = client.post(
        path, content=b'{"title":"\xff"}', headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 422
    error = Error.model_validate(response.json())
    assert error.code == "validation_error"
    assert error.fields and [item.field for item in error.fields] == [""]
