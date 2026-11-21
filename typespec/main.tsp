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
  code: "validation_error" | "meeting_type_not_found" | "slot_unavailable" | "conflict";
  message: string;
  reason?: "past" | "outside_window" | "off_grid" | "outside_working_hours";
  fields?: FieldError[];
}

model Slot {
  startAt: utcDateTime;
  endAt: utcDateTime;
}

model MeetingTypeNotFound {
  @statusCode status: 404;
  @body error: Error;
}

@route("/meeting-types")
@tag("meeting-types")
interface MeetingTypes {
  @route("{id}") @get op get(@path @format("uuid") id: string): MeetingType | MeetingTypeNotFound;

  @route("{id}/slots") @get op slots(@path @format("uuid") id: string): Slot[] | MeetingTypeNotFound;

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

model CreateBooking {
  @format("uuid") meetingTypeId: string;
  startAt: utcDateTime;
  @minLength(1) @maxLength(100) guestName: string;
  @format("email") guestEmail: string;
}

model Booking extends CreateBooking {
  @format("uuid") id: string;
  endAt: utcDateTime;
}

@route("/bookings")
@tag("bookings")
interface Bookings {
  /** Upcoming and ongoing bookings, ordered by start time. */
  @get op list(): Booking[];

  @post op create(@body input: CreateBooking): {
    @statusCode status: 201;
    @body result: Booking;
  } | MeetingTypeNotFound | {
    @statusCode status: 409;
    @body error: Error;
  } | {
    @statusCode status: 422;
    @body error: Error;
  };
}
