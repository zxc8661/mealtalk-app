import type { LocalDatabase } from '@/db/database';
import { MIGRATIONS } from '@/db/schema';

type VersionRow = { readonly user_version: number };

/**
 * Applies every schema step the database has not seen yet.
 *
 * `user_version` cannot be parameterized by SQLite, so the value is interpolated
 * from the migration index - a number this module owns, never user input.
 */
export async function runMigrations(database: LocalDatabase): Promise<void> {
  const current = (await database.get<VersionRow>('PRAGMA user_version'))?.user_version ?? 0;

  for (let version = current; version < MIGRATIONS.length; version += 1) {
    await database.exec(`BEGIN; ${MIGRATIONS[version]} PRAGMA user_version = ${version + 1}; COMMIT;`);
  }
}
