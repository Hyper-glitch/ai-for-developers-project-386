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

model CreateMeetingType {
  @minLength(1) @maxLength(100) title: string;
  @maxLength(1000) description: string;
  durationMinutes: 15 | 30 | 45 | 60 | 75 | 90 | 105 | 120;
}

model MeetingType extends CreateMeetingType {
  @format("uuid") id: string;
}

model FieldError {
  field: string;
  message: string;
}

model Error {
  code: string;
  message: string;
  reason?: string;
  fields?: FieldError[];
}

@route("/meeting-types")
@tag("meeting-types")
interface MeetingTypes {
  /** List the owner's meeting types in creation order. */
  @get op list(): MeetingType[];

  @post op create(@body input: CreateMeetingType): {
    @statusCode status: 201;
    @body result: MeetingType;
  } | {
    @statusCode status: 422;
    @body error: Error;
  };
}
