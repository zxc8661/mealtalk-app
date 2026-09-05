import { useEffect, useState } from 'react';

import { storeMessage } from '@/db/store-error';

export type AsyncRead<T> = {
  readonly data: T | null;
  readonly isLoading: boolean;
  readonly error: string | null;
};

/**
 * Runs one local read and reports its outcome.
 *
 * `key` identifies the request: loading is derived by comparing it with the key
 * of whatever settled last, so the effect never has to set state up front just to
 * raise a spinner, and a result that arrives after the key changed is discarded
 * rather than shown under the wrong heading.
 */
export function useAsyncRead<T>(read: () => Promise<T>, key: string): AsyncRead<T> {
  const [settled, setSettled] = useState<{
    readonly key: string;
    readonly data: T | null;
    readonly error: string | null;
  } | null>(null);

  useEffect(() => {
    let active = true;
    read().then(
      (data) => {
        if (active) setSettled({ key, data, error: null });
      },
      (cause: unknown) => {
        if (active) setSettled({ key, data: null, error: storeMessage(cause) });
      },
    );
    return () => {
      active = false;
    };
    // `read` closes over the current render's values and is recreated every
    // render; `key` is the identity of the request it stands for.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const current = settled?.key === key ? settled : null;
  return { data: current?.data ?? null, isLoading: current === null, error: current?.error ?? null };
}
