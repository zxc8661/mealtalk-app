const DEFAULT_API_URL = 'http://localhost:8080';
const E2E_TOKEN_GLOBAL = '__MEALTALK_E2E_ID_TOKEN__';
const E2E_SESSION_PROBE_GLOBAL = '__MEALTALK_E2E_SESSION_PROBE_PATH__';

type E2EGlobal = typeof globalThis & {
  [E2E_TOKEN_GLOBAL]?: unknown;
  [E2E_SESSION_PROBE_GLOBAL]?: unknown;
};

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL).replace(/\/$/, '');

/**
 * Browser E2E may inject a backend-fixture ID token before the app loads. The token is deliberately
 * read at runtime rather than from EXPO_PUBLIC_* so it cannot be embedded in a production bundle.
 */
export function getE2ETestIdToken(): string | null {
  if (!isE2EAuthEnabled()) return null;

  const candidate = (globalThis as E2EGlobal)[E2E_TOKEN_GLOBAL];
  return typeof candidate === 'string' && candidate.length > 0 ? candidate : null;
}

/** Development-only endpoint used to verify that a 401 clears the browser session. */
export function getE2ESessionProbePath(): string | null {
  if (!isE2EAuthEnabled()) return null;

  const candidate = (globalThis as E2EGlobal)[E2E_SESSION_PROBE_GLOBAL];
  return typeof candidate === 'string' && candidate.startsWith('/') ? candidate : null;
}

function isE2EAuthEnabled(): boolean {
  return __DEV__ && process.env.EXPO_PUBLIC_E2E_AUTH_ENABLED === 'true';
}
