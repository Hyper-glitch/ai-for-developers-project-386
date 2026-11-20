/** URL of every page; routes and links both read from here. */
export const paths = {
  home: '/',
  catalog: '/book',
  owner: '/owner',
  ownerBookings: '/owner/bookings',
  ownerMeetingTypes: '/owner/meeting-types',
  meetingType: (id: string) => `/book/${id}`,
} as const;
