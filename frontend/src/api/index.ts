// Single entry point to the generated SDK: configures the base URL once.
import { client } from '../client/client.gen';

client.setConfig({
  baseUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
});

export * from '../client';
