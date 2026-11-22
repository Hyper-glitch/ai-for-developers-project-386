import { test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const site = 'https://booking-calendar-production-28e04b8e.up.railway.app';
for (const scenario of ['public-booking', 'public-conflict']) {
  test(scenario, () => {
    execFileSync(process.execPath, [resolve(scenario + '.mjs'), site], {
      cwd: resolve('..'), stdio: 'inherit',
    });
  });
}
