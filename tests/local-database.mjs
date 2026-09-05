import { DatabaseSync } from 'node:sqlite';

/**
 * The test driver for the same `LocalDatabase` seam the app implements over
 * expo-sqlite. Both wrap real SQLite, so the SQL under test is the SQL that
 * ships - a hand-written fake would only ever agree with itself.
 *
 * `node:sqlite` is synchronous, so each call is wrapped in a resolved promise to
 * match the async contract the app's driver has to satisfy.
 */
export function openTestDatabase() {
  const database = new DatabaseSync(':memory:');
  return {
    exec: async (sql) => database.exec(sql),
    all: async (sql, params = []) => database.prepare(sql).all(...params),
    get: async (sql, params = []) => database.prepare(sql).get(...params) ?? null,
    run: async (sql, params = []) => ({
      lastInsertRowId: Number(database.prepare(sql).run(...params).lastInsertRowid),
    }),
  };
}
