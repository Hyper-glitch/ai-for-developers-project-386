// Single entry point to the generated SDK: configures the base URL once.
import { client } from '../client/client.gen';
import {
  meetingTypesCreate,
  meetingTypesGet,
  meetingTypesSlots,
  type Slot,
  meetingTypesList,
  type CreateMeetingType,
  type MeetingTypesCreateError,
  type MeetingType,
} from '../client';

client.setConfig({
  baseUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
});

export * from '../client';

export async function listMeetingTypes(): Promise<MeetingType[]> {
  const { data } = await meetingTypesList({ throwOnError: true });
  return data;
}

export async function createMeetingType(
  body: CreateMeetingType,
): Promise<
  { data: MeetingType; error?: never } | { data?: never; error: MeetingTypesCreateError }
> {
  const { data, error } = await meetingTypesCreate({ body });
  return data ? { data } : { error };
}

export async function getMeetingType(id: string): Promise<MeetingType> {
  const { data } = await meetingTypesGet({ path: { id }, throwOnError: true });
  return data;
}

export async function listSlots(id: string): Promise<Slot[]> {
  const { data } = await meetingTypesSlots({ path: { id }, throwOnError: true });
  return data;
}
