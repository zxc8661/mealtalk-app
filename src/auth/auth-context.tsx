import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { readSessionToken, removeSessionToken, writeSessionToken } from '@/auth/session';
import { API_URL, getE2ETestIdToken } from '@/config/environment';

type AuthContextValue = {
  readonly isLoading: boolean;
  readonly accessToken: string | null;
  readonly signIn: (idToken: string) => Promise<void>;
  readonly signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

class AuthApiError extends Error {
  readonly status: number;

  constructor(status: number) {
    super('로그인에 실패했습니다.');
    this.name = 'AuthApiError';
    this.status = status;
  }
}

async function exchangeGoogleToken(idToken: string): Promise<string> {
  const response = await fetch(`${API_URL}/api/v1/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  if (!response.ok) {
    throw new AuthApiError(response.status);
  }
  const body: unknown = await response.json();
  if (
    typeof body !== 'object' ||
    body === null ||
    !('accessToken' in body) ||
    typeof body.accessToken !== 'string'
  ) {
    throw new AuthApiError(response.status);
  }
  return body.accessToken;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void readSessionToken()
      .then(async (storedToken) => {
        if (storedToken) return storedToken;

        const e2eIdToken = getE2ETestIdToken();
        if (!e2eIdToken) return null;

        const fixtureAccessToken = await exchangeGoogleToken(e2eIdToken);
        await writeSessionToken(fixtureAccessToken);
        return fixtureAccessToken;
      })
      .then((token) => setAccessToken(token))
      .catch((error: unknown) => {
        if (error instanceof Error) {
          console.warn('저장된 로그인 정보를 준비하지 못했습니다.', error.message);
          return;
        }
        throw error;
      })
      .finally(() => setIsLoading(false));
  }, []);

  const signIn = useCallback(async (idToken: string) => {
    const token = await exchangeGoogleToken(idToken);
    await writeSessionToken(token);
    setAccessToken(token);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await removeSessionToken();
    } finally {
      setAccessToken(null);
    }
  }, []);

  const value = useMemo(
    () => ({ isLoading, accessToken, signIn, signOut }),
    [accessToken, isLoading, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}

export { AuthApiError };
