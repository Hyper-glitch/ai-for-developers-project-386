/** URL of every page; routes and links both read from here. */
export const paths = {
  home: '/',
  catalog: '/book',
  meetingType: (id: string) => `/book/${id}`,
} as const;
