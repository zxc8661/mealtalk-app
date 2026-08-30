import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { ApiError } from '@/api/api-error';
import { useApi } from '@/api/api-context';
import { requestMessage } from '@/api/error-message';
import { getCurrentUser, type CurrentUser } from '@/profile/profile-api';

type CurrentUserValue = {
  readonly user: CurrentUser | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly reload: () => void;
  /** Applies a server response the caller already received, avoiding a refetch. */
  readonly apply: (user: CurrentUser) => void;
};

const CurrentUserContext = createContext<CurrentUserValue | null>(null);

/**
 * Loads `/api/v1/me` once for the signed-in session. The onboarding gate, home
 * targets and the profile screen all read from this single source.
 */
export function CurrentUserProvider({ children }: PropsWithChildren) {
  const api = useApi();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  /** Loading is derived from which request has settled, so the effect sets no state up front. */
  const [settledKey, setSettledKey] = useState(-1);

  useEffect(() => {
    const controller = new AbortController();
    void getCurrentUser(api, controller.signal)
      .then((next) => {
        if (controller.signal.aborted) return;
        setUser(next);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        // A 401 already triggers sign-out through the API client.
        if (cause instanceof ApiError && cause.isUnauthorized) return;
        setError(requestMessage(cause));
      })
      .finally(() => {
        if (!controller.signal.aborted) setSettledKey(reloadKey);
      });
    return () => controller.abort();
  }, [api, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);
  const apply = useCallback((next: CurrentUser) => {
    setUser(next);
    setError(null);
  }, []);

  const value = useMemo<CurrentUserValue>(
    () => ({ user, isLoading: settledKey !== reloadKey, error, reload, apply }),
    [user, settledKey, reloadKey, error, reload, apply],
  );

  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUser(): CurrentUserValue {
  const value = useContext(CurrentUserContext);
  if (value === null) throw new Error('useCurrentUser must be used inside CurrentUserProvider');
  return value;
}
