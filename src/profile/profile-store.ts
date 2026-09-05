import type { LocalDatabase } from '@/db/database';

export type ActivityLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type GoalMode = 'LOSS' | 'MAINTAIN' | 'GAIN';

/**
 * The owner's own notes about themselves. Nothing reads these to compute a
 * number - the journal records what was eaten, not what it contained - so every
 * field is optional and an unset profile is a valid state, not a setup gate.
 */
export type Profile = {
  readonly displayName: string | null;
  readonly heightCm: number | null;
  readonly weightKg: number | null;
  readonly activityLevel: ActivityLevel | null;
  readonly goalMode: GoalMode | null;
};

export const EMPTY_PROFILE: Profile = {
  displayName: null,
  heightCm: null,
  weightKg: null,
  activityLevel: null,
  goalMode: null,
};

type ProfileRow = {
  readonly display_name: string | null;
  readonly height_cm: number | null;
  readonly weight_kg: number | null;
  readonly activity_level: string | null;
  readonly goal_mode: string | null;
};

export async function readProfile(database: LocalDatabase): Promise<Profile> {
  const row = await database.get<ProfileRow>(
    'SELECT display_name, height_cm, weight_kg, activity_level, goal_mode FROM profile WHERE id = 1',
  );
  if (row === null) return EMPTY_PROFILE;

  return {
    displayName: row.display_name,
    heightCm: row.height_cm,
    weightKg: row.weight_kg,
    activityLevel: row.activity_level as ActivityLevel | null,
    goalMode: row.goal_mode as GoalMode | null,
  };
}

export async function writeProfile(
  database: LocalDatabase,
  profile: Profile,
): Promise<Profile> {
  await database.run(
    `INSERT INTO profile (id, display_name, height_cm, weight_kg, activity_level, goal_mode, updated_at)
     VALUES (1, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       display_name = excluded.display_name,
       height_cm = excluded.height_cm,
       weight_kg = excluded.weight_kg,
       activity_level = excluded.activity_level,
       goal_mode = excluded.goal_mode,
       updated_at = excluded.updated_at`,
    [
      profile.displayName,
      profile.heightCm,
      profile.weightKg,
      profile.activityLevel,
      profile.goalMode,
      new Date().toISOString(),
    ],
  );
  return readProfile(database);
}
