// Single entry point to the generated SDK: configures the base URL once.
import { client } from '../client/client.gen';
import { meetingTypesList, type MeetingType } from '../client';

client.setConfig({
  baseUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
});

export * from '../client';

export async function listMeetingTypes(): Promise<MeetingType[]> {
  const { data } = await meetingTypesList({ throwOnError: true });
  return data;
}
