import { useCallback, useEffect, useState } from 'react';

import { ApiError } from '@/api/api-error';
import { useApi } from '@/api/api-context';
import { requestMessage } from '@/api/error-message';
import { isIsoDate } from '@/nutrition/format';
import { listMeals, type MealJournal } from '@/meal/meal-api';

type JournalState = {
  readonly journal: MealJournal | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly reload: () => void;
};

/** Loads one day's meals and totals, reloading whenever the date changes. */
export function useMealJournal(date: string, reloadToken = 0): JournalState {
  const api = useApi();
  const [journal, setJournal] = useState<MealJournal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  /**
   * Identifies the request the current state belongs to. Loading is derived by
   * comparing it with the requested key, so the effect never has to set state
   * synchronously just to raise a spinner.
   */
  const requestKey = `${date}:${reloadKey}:${reloadToken}`;
  const [settledKey, setSettledKey] = useState<string | null>(null);

  useEffect(() => {
    if (!isIsoDate(date)) return;
    const controller = new AbortController();
    void listMeals(api, date, controller.signal)
      .then((next) => {
        if (controller.signal.aborted) return;
        setJournal(next);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        if (cause instanceof ApiError && cause.isUnauthorized) return;
        setError(requestMessage(cause));
      })
      .finally(() => {
        if (!controller.signal.aborted) setSettledKey(requestKey);
      });
    return () => controller.abort();
  }, [api, date, requestKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  return { journal, isLoading: settledKey !== requestKey, error, reload };
}
