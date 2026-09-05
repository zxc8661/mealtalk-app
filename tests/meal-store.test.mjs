import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { runMigrations } from '@/db/migrate';
import {
  EmptyMealRecordError,
  MealNotFoundError,
  MemoTooLongError,
  MEMO_MAX_LENGTH,
  normalizeMemo,
} from '@/meal/meal-record';
import {
  createMeal,
  deleteMeal,
  getMeal,
  listMeals,
  listRecordedDates,
  updateMeal,
} from '@/meal/meal-store';
import { EMPTY_PROFILE, readProfile, writeProfile } from '@/profile/profile-store';

import { openTestDatabase } from './local-database.mjs';

const PHOTO = { file: 'a.jpg', width: 1024, height: 768 };

function draft(overrides = {}) {
  return {
    mealDate: '2026-08-30',
    mealType: 'LUNCH',
    eatenAt: null,
    memo: '김치찌개',
    photo: null,
    ...overrides,
  };
}

describe('local meal store', () => {
  let database;

  beforeEach(async () => {
    database = openTestDatabase();
    await runMigrations(database);
  });

  it('migrates an empty database once and is safe to re-run', async () => {
    await runMigrations(database);
    assert.equal((await database.get('PRAGMA user_version')).user_version, 1);
    assert.deepEqual(await listMeals(database, '2026-08-30'), []);
  });

  it('stores a memo-only record and reads it back on its date', async () => {
    const created = await createMeal(database, draft());

    assert.equal(created.memo, '김치찌개');
    assert.equal(created.photo, null);
    assert.deepEqual(await listMeals(database, '2026-08-30'), [created]);
    assert.deepEqual(await listMeals(database, '2026-08-29'), []);
  });

  it('stores a photo-only record with its dimensions', async () => {
    const created = await createMeal(database, draft({ memo: null, photo: PHOTO }));

    assert.equal(created.memo, null);
    assert.deepEqual(created.photo, PHOTO);
    assert.deepEqual(await getMeal(database, created.id), created);
  });

  it('trims a memo and treats a whitespace-only memo as absent', async () => {
    const created = await createMeal(database, draft({ memo: '  볶음밥  ' }));

    assert.equal(created.memo, '볶음밥');
    assert.equal(normalizeMemo('   '), null);
    await assert.rejects(
      () => createMeal(database, draft({ memo: '   ', photo: null })),
      EmptyMealRecordError,
    );
  });

  it('refuses a record with neither memo nor photo', async () => {
    await assert.rejects(
      () => createMeal(database, draft({ memo: null, photo: null })),
      EmptyMealRecordError,
    );
    assert.deepEqual(await listMeals(database, '2026-08-30'), []);
  });

  it('refuses a memo longer than the limit but accepts one at the limit', async () => {
    const atLimit = 'ㄱ'.repeat(MEMO_MAX_LENGTH);
    const created = await createMeal(database, draft({ memo: atLimit }));

    assert.equal(created.memo.length, MEMO_MAX_LENGTH);
    await assert.rejects(
      () => createMeal(database, draft({ memo: `${atLimit}ㄱ` })),
      MemoTooLongError,
    );
  });

  it('orders a day by eaten time and puts untimed records last', async () => {
    const untimed = await createMeal(database, draft({ memo: '언제인지 모름' }));
    const evening = await createMeal(
      database,
      draft({ memo: '저녁', eatenAt: '2026-08-30T11:00:00.000Z' }),
    );
    const morning = await createMeal(
      database,
      draft({ memo: '아침', eatenAt: '2026-08-30T00:00:00.000Z' }),
    );

    const listed = await listMeals(database, '2026-08-30');
    assert.deepEqual(
      listed.map((meal) => meal.id),
      [morning.id, evening.id, untimed.id],
    );
  });

  it('reports the superseded photo when an edit replaces it', async () => {
    const created = await createMeal(database, draft({ photo: PHOTO }));

    const replaced = await updateMeal(
      database,
      created.id,
      draft({ memo: '수정함', photo: { file: 'b.jpg', width: 800, height: 600 } }),
    );

    assert.deepEqual(replaced.supersededPhoto, PHOTO);
    assert.equal(replaced.record.photo.file, 'b.jpg');
    assert.equal(replaced.record.memo, '수정함');
  });

  it('reports no superseded photo when an edit keeps the same file', async () => {
    const created = await createMeal(database, draft({ photo: PHOTO }));

    const kept = await updateMeal(database, created.id, draft({ memo: '메모만 수정', photo: PHOTO }));

    assert.equal(kept.supersededPhoto, null);
    assert.deepEqual(kept.record.photo, PHOTO);
  });

  it('reports the removed photo when an edit drops it', async () => {
    const created = await createMeal(database, draft({ photo: PHOTO }));

    const removed = await updateMeal(database, created.id, draft({ memo: '사진 뺌', photo: null }));

    assert.deepEqual(removed.supersededPhoto, PHOTO);
    assert.equal(removed.record.photo, null);
  });

  it('refuses an edit that would leave the record empty and keeps the stored row', async () => {
    const created = await createMeal(database, draft({ memo: '남아야 함' }));

    await assert.rejects(
      () => updateMeal(database, created.id, draft({ memo: null, photo: null })),
      EmptyMealRecordError,
    );
    assert.deepEqual(await getMeal(database, created.id), created);
  });

  it('moves a record to another date', async () => {
    const created = await createMeal(database, draft());

    await updateMeal(database, created.id, draft({ mealDate: '2026-08-31' }));

    assert.deepEqual(await listMeals(database, '2026-08-30'), []);
    assert.equal((await listMeals(database, '2026-08-31')).length, 1);
  });

  it('returns the orphaned photo when a record is deleted', async () => {
    const withPhoto = await createMeal(database, draft({ photo: PHOTO }));
    const withoutPhoto = await createMeal(database, draft());

    assert.deepEqual(await deleteMeal(database, withPhoto.id), PHOTO);
    assert.equal(await deleteMeal(database, withoutPhoto.id), null);
    assert.deepEqual(await listMeals(database, '2026-08-30'), []);
  });

  it('reports a missing record rather than silently doing nothing', async () => {
    assert.equal(await getMeal(database, 999), null);
    await assert.rejects(() => updateMeal(database, 999, draft()), MealNotFoundError);
    await assert.rejects(() => deleteMeal(database, 999), MealNotFoundError);
  });

  it('lists recorded dates newest first', async () => {
    await createMeal(database, draft({ mealDate: '2026-08-28' }));
    await createMeal(database, draft({ mealDate: '2026-08-30' }));
    await createMeal(database, draft({ mealDate: '2026-08-30', memo: '둘째' }));

    assert.deepEqual(await listRecordedDates(database, 10), ['2026-08-30', '2026-08-28']);
    assert.deepEqual(await listRecordedDates(database, 1), ['2026-08-30']);
  });
});

describe('local profile store', () => {
  let database;

  beforeEach(async () => {
    database = openTestDatabase();
    await runMigrations(database);
  });

  it('reads an empty profile before anything is written', async () => {
    assert.deepEqual(await readProfile(database), EMPTY_PROFILE);
  });

  it('writes and overwrites the single profile row', async () => {
    await writeProfile(database, {
      displayName: '지훈',
      heightCm: 176,
      weightKg: 71.5,
      activityLevel: 'MEDIUM',
      goalMode: 'LOSS',
    });

    const updated = await writeProfile(database, {
      ...(await readProfile(database)),
      weightKg: 70,
      goalMode: 'MAINTAIN',
    });

    assert.deepEqual(updated, {
      displayName: '지훈',
      heightCm: 176,
      weightKg: 70,
      activityLevel: 'MEDIUM',
      goalMode: 'MAINTAIN',
    });
    assert.equal((await database.get('SELECT COUNT(*) AS count FROM profile')).count, 1);
  });
});
