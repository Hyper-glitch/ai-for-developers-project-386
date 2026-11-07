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
