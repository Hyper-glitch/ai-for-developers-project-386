import { defineConfig } from '@playwright/test';

const api = 'http://127.0.0.1:8100';
const frontend = 'http://127.0.0.1:5273';

export default defineConfig({
  testDir: './tests',
  workers: 1,
  use: { browserName: 'chromium', baseURL: frontend },
  webServer: [
    {
      command: 'uv run fastapi run app/main.py --host 127.0.0.1 --port 8100 --workers 1',
      cwd: '../backend',
      url: api + '/health',
      env: { CORS_ORIGINS: frontend },
      reuseExistingServer: false,
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 5273 --strictPort',
      cwd: '../frontend',
      url: frontend,
      env: { VITE_API_URL: api },
      reuseExistingServer: false,
    },
  ],
});
