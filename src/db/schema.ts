/**
 * Forward-only schema steps for the on-device database.
 *
 * Each entry is applied once, in order, and `PRAGMA user_version` records how far
 * a device has come. Append a step; never edit a shipped one, because a device
 * that already ran it will not run it again.
 */
export const MIGRATIONS: readonly string[] = [
  `
  CREATE TABLE meals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meal_date TEXT NOT NULL,
    meal_type TEXT NOT NULL,
    eaten_at TEXT,
    memo TEXT,
    photo_file TEXT,
    photo_width INTEGER,
    photo_height INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (memo IS NOT NULL OR photo_file IS NOT NULL),
    CHECK ((photo_file IS NULL) = (photo_width IS NULL)),
    CHECK ((photo_file IS NULL) = (photo_height IS NULL))
  );
  CREATE INDEX idx_meals_date ON meals (meal_date, eaten_at, id);

  CREATE TABLE profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    display_name TEXT,
    height_cm REAL,
    weight_kg REAL,
    activity_level TEXT,
    goal_mode TEXT,
    updated_at TEXT NOT NULL
  );
  `,
];
