import "@typespec/http";

using Http;

/** Booking service API. Single source of truth for the OpenAPI spec and generated clients. */
@service(#{ title: "Booking API" })
@server("http://localhost:8000", "Local development server")
namespace BookingApi;

/** Liveness response. */
model Health {
  status: "ok";
}

@route("/health")
@tag("system")
interface System {
  /** Report that the service is up. */
  @get op health(): Health;
}

model MeetingType {
  @format("uuid") id: string;
  @minLength(1) @maxLength(100) title: string;
  @maxLength(1000) description: string;
  @minValue(15) @maxValue(120) durationMinutes: int32;
}

@route("/meeting-types")
@tag("meeting-types")
interface MeetingTypes {
  /** List the owner's meeting types in creation order. */
  @get op list(): MeetingType[];
}
