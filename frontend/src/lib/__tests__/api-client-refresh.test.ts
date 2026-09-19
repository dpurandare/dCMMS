/**
 * REV-035: concurrent 401s must serialize behind a single /auth/refresh
 * call, not each fire their own — with refresh-token rotation, a second
 * concurrent refresh call can invalidate the token the first one just
 * issued, incorrectly logging out a session that was actually still valid.
 *
 * Uses axios's own `adapter` override to simulate the backend without a
 * network dependency, so the real interceptor code under test runs exactly
 * as it does in production — only the HTTP transport is faked.
 */
import axios, { AxiosRequestConfig } from 'axios';
import { apiClient } from '@/lib/api-client';

let mockAccessToken = 'expired-token';
const mockLogout = jest.fn();

jest.mock('@/store/auth-store', () => ({
  useAuthStore: {
    getState: () => ({
      accessToken: mockAccessToken,
      setAccessToken: (token: string) => {
        mockAccessToken = token;
      },
      logout: mockLogout,
    }),
  },
}));

function fakeResponse(config: AxiosRequestConfig, data: unknown) {
  return { status: 200, statusText: 'OK', data, headers: {}, config };
}

function fakeUnauthorized(config: AxiosRequestConfig) {
  const error = new Error('Request failed with status code 401') as any;
  error.isAxiosError = true;
  error.config = config;
  error.response = { status: 401, statusText: 'Unauthorized', data: {}, headers: {}, config };
  throw error;
}

describe('apiClient token refresh (REV-035)', () => {
  let refreshCallCount: number;

  beforeEach(() => {
    mockAccessToken = 'expired-token';
    refreshCallCount = 0;
    mockLogout.mockClear();

    // jsdom throws "Not implemented: navigation" on a real assignment;
    // only exercised on the refresh-failure path, but stub it regardless.
    delete (window as any).location;
    (window as any).location = { href: '' };

    // Requests through apiClient: 401 unless carrying the post-refresh token.
    apiClient.defaults.adapter = jest.fn(async (config: AxiosRequestConfig) => {
      if (config.headers?.Authorization === 'Bearer refreshed-token') {
        return fakeResponse(config, { ok: true, url: config.url });
      }
      return fakeUnauthorized(config);
    }) as any;

    // The bare axios instance is what the interceptor calls for
    // /auth/refresh directly (bypassing apiClient's own interceptors).
    axios.defaults.adapter = jest.fn(async (config: AxiosRequestConfig) => {
      refreshCallCount += 1;
      return fakeResponse(config, { accessToken: 'refreshed-token' });
    }) as any;
  });

  it('fires exactly one refresh call for five concurrent 401s, and all five succeed', async () => {
    const requests = Array.from({ length: 5 }, (_, i) => apiClient.get(`/work-orders/${i}`));

    const results = await Promise.all(requests);

    expect(refreshCallCount).toBe(1);
    expect(results).toHaveLength(5);
    results.forEach((r) => expect(r.data.ok).toBe(true));
    expect(mockLogout).not.toHaveBeenCalled();
  });
});
