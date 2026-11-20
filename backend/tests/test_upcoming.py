"""Owner's chronological list of meetings that still occupy time."""

from fastapi.testclient import TestClient

from app.generated.models import Booking


def test_upcoming_includes_ongoing_in_order(client: TestClient, upcoming: list[Booking]) -> None:
    response = client.get("/bookings")
    assert response.status_code == 200
    assert [Booking.model_validate(item) for item in response.json()] == upcoming
