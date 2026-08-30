import { createContext, type PropsWithChildren, useContext, useMemo } from 'react';

import { createApiClient, type ApiClient } from '@/api/client';
import { useAuth } from '@/auth/auth-context';
import { API_URL } from '@/config/environment';

const ApiContext = createContext<ApiClient | null>(null);

export function ApiProvider({ children }: PropsWithChildren) {
  const { accessToken, signOut } = useAuth();
  const client = useMemo(
    () =>
      createApiClient({
        baseUrl: API_URL,
        getAccessToken: () => accessToken,
        onUnauthorized: signOut,
      }),
    [accessToken, signOut],
  );

  return <ApiContext.Provider value={client}>{children}</ApiContext.Provider>;
}

export function useApi(): ApiClient {
  const client = useContext(ApiContext);
  if (client === null) throw new Error('useApi must be used inside ApiProvider');
  return client;
}
