"""Verify both API descriptions expose the same operations and response statuses."""

from pathlib import Path
from typing import TypedDict

import yaml  # type: ignore[import-untyped]
from fastapi.testclient import TestClient


class Operation(TypedDict):
    responses: dict[str, object]


def test_routes_match_contract(client: TestClient) -> None:
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
