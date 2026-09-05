import * as SQLite from 'expo-sqlite';

import { runMigrations } from '@/db/migrate';

export type SqlValue = string | number | null;

/**
 * The narrow asynchronous surface every storage module is written against.
 *
 * It is async rather than sync for two reasons that both bite in practice: on
 * web the synchronous bridge times out on the main thread, and on native expo
 * warns that sync queries block the JS thread. Keeping the seam this narrow is
 * what lets a plain SQLite driver stand in for it in tests.
 */
export type LocalDatabase = {
  exec(sql: string): Promise<void>;
  all<Row>(sql: string, params?: readonly SqlValue[]): Promise<Row[]>;
  get<Row>(sql: string, params?: readonly SqlValue[]): Promise<Row | null>;
  run(sql: string, params?: readonly SqlValue[]): Promise<{ readonly lastInsertRowId: number }>;
};

/**
 * The database file name. Renaming it after a release would orphan every
 * existing user's records, so this is fixed from the first published build.
 */
const DATABASE_NAME = 'bapilgi.db';

export function adaptExpoDatabase(database: SQLite.SQLiteDatabase): LocalDatabase {
  return {
    exec: (sql) => database.execAsync(sql),
    all: (sql, params = []) => database.getAllAsync(sql, [...params]),
    get: (sql, params = []) => database.getFirstAsync(sql, [...params]),
    run: async (sql, params = []) => ({
      lastInsertRowId: (await database.runAsync(sql, [...params])).lastInsertRowId,
    }),
  };
}

let opening: Promise<LocalDatabase> | null = null;

/**
 * Opens the on-device database once and migrates it before the first read.
 *
 * The promise itself is cached, not just its result, so two screens mounting at
 * the same time cannot both start a migration against the same file.
 */
export function openLocalDatabase(): Promise<LocalDatabase> {
  if (opening === null) {
    opening = (async () => {
      const database = adaptExpoDatabase(await SQLite.openDatabaseAsync(DATABASE_NAME));
      await runMigrations(database);
      return database;
    })().catch((error: unknown) => {
      // A failed open must not be cached as the permanent answer: the next
      // attempt should be able to try again rather than replay the failure.
      opening = null;
      throw error;
    });
  }
  return opening;
}
