import { createContext, type PropsWithChildren, type ReactNode, useContext, useEffect, useState } from 'react';

import { openLocalDatabase, type LocalDatabase } from '@/db/database';

const DatabaseContext = createContext<LocalDatabase | null>(null);

type OpenState =
  | { readonly status: 'opening' }
  | { readonly status: 'ready'; readonly database: LocalDatabase }
  | { readonly status: 'failed'; readonly error: unknown };

/**
 * Opens the on-device database for the whole app.
 *
 * Nothing below can read or write until it is open, so the tree is mounted only
 * once it is: a screen rendered against a missing handle would have to invent an
 * empty journal, which is indistinguishable from a day with no records.
 */
export function DatabaseProvider({
  children,
  loading,
  fallback,
}: PropsWithChildren<{
  readonly loading: ReactNode;
  readonly fallback: (error: unknown) => ReactNode;
}>) {
  const [state, setState] = useState<OpenState>({ status: 'opening' });

  useEffect(() => {
    let active = true;
    openLocalDatabase().then(
      (database) => {
        if (active) setState({ status: 'ready', database });
      },
      (error: unknown) => {
        if (active) setState({ status: 'failed', error });
      },
    );
    return () => {
      active = false;
    };
  }, []);

  if (state.status === 'opening') return <>{loading}</>;
  if (state.status === 'failed') return <>{fallback(state.error)}</>;

  return <DatabaseContext.Provider value={state.database}>{children}</DatabaseContext.Provider>;
}

export function useDatabase(): LocalDatabase {
  const database = useContext(DatabaseContext);
  if (database === null) throw new Error('useDatabase must be used inside DatabaseProvider');
  return database;
}
