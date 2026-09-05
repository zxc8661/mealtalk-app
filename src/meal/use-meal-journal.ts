import { useCallback, useState } from 'react';

import { useDatabase } from '@/db/database-context';
import { useAsyncRead } from '@/db/use-async-read';
import { isIsoDate } from '@/format/date';
import type { MealRecord } from '@/meal/meal-record';
import { listMeals } from '@/meal/meal-store';

type JournalState = {
  readonly meals: readonly MealRecord[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly reload: () => void;
};

const NO_MEALS: readonly MealRecord[] = [];

/**
 * One day's records. `reloadToken` lets a screen re-read after it regains focus
 * or writes a record, without owning the read itself.
 */
export function useMealJournal(date: string, reloadToken = 0): JournalState {
  const database = useDatabase();
  const [reloadKey, setReloadKey] = useState(0);

  const { data, isLoading, error } = useAsyncRead(
    () => (isIsoDate(date) ? listMeals(database, date) : Promise.resolve([])),
    `${date}:${reloadKey}:${reloadToken}`,
  );

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  return { meals: data ?? NO_MEALS, isLoading, error, reload };
}
