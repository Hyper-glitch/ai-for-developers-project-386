import { afterEach, describe, expect, it, vi } from 'vitest';

import { systemHealth } from './index';

describe('generated SDK', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls GET /health on the configured backend', async () => {
    const fetchMock = vi.fn(async () => Response.json({ status: 'ok' }));
    vi.stubGlobal('fetch', fetchMock);

    const { data } = await systemHealth();

    expect(data).toEqual({ status: 'ok' });
    const [request] = fetchMock.mock.calls[0] as unknown as [Request];
    expect(request.method).toBe('GET');
    expect(request.url).toBe('http://localhost:8000/health');
  });
});
