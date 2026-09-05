import { createContext, type PropsWithChildren, useCallback, useContext, useMemo, useState } from 'react';

import { useDatabase } from '@/db/database-context';
import { useAsyncRead } from '@/db/use-async-read';
import { EMPTY_PROFILE, readProfile, type Profile } from '@/profile/profile-store';

type ProfileValue = {
  readonly profile: Profile;
  readonly isLoading: boolean;
  readonly error: string | null;
  /** Adopts a profile the caller just wrote, avoiding a re-read. */
  readonly apply: (profile: Profile) => void;
};

const ProfileContext = createContext<ProfileValue | null>(null);

/**
 * The owner's profile, read once from the device.
 *
 * An unset profile is a normal state, not a setup gate: nothing in the journal
 * depends on it, so the app is fully usable before anything is filled in.
 */
export function ProfileProvider({ children }: PropsWithChildren) {
  const database = useDatabase();
  const [applied, setApplied] = useState<Profile | null>(null);
  const { data, isLoading, error } = useAsyncRead(() => readProfile(database), 'profile');

  const apply = useCallback((profile: Profile) => setApplied(profile), []);

  const value = useMemo<ProfileValue>(
    () => ({ profile: applied ?? data ?? EMPTY_PROFILE, isLoading, error, apply }),
    [applied, data, isLoading, error, apply],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileValue {
  const value = useContext(ProfileContext);
  if (value === null) throw new Error('useProfile must be used inside ProfileProvider');
  return value;
}
