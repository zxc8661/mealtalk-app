/**
 * Endpoint contract check.
 *
 * Calls every endpoint the app actually uses and validates the live response
 * shape against the field names the frontend TypeScript types declare.
 * Catches drift that a path-only comparison cannot see.
 *
 *   node scripts/contract-check.mjs
 */
const API = process.env.QA_API_URL ?? 'http://localhost:8080';
const ID_TOKEN = process.env.QA_ID_TOKEN ?? 'mealtalk-e2e-id-token';

let failed = false;
const check = (label, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` :: ${detail}` : ''}`);
  if (!ok) failed = true;
};

/** Every key the frontend type declares must exist on the live payload. */
function expectFields(label, object, fields) {
  if (object === null || typeof object !== 'object') {
    check(label, false, `not an object: ${JSON.stringify(object)}`);
    return;
  }
  const missing = fields.filter((f) => !(f in object));
  const extra = Object.keys(object).filter((k) => !fields.includes(k));
  check(
    label,
    missing.length === 0,
    missing.length ? `missing: ${missing.join(', ')}` : extra.length ? `extra (ok): ${extra.join(', ')}` : 'exact',
  );
}

async function call(method, path, { token, body } = {}) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let parsed = null;
  if (text.length > 0) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }
  return { status: response.status, body: parsed };
}

// --- POST /api/v1/auth/google -------------------------------------------------
const auth = await call('POST', '/api/v1/auth/google', { body: { idToken: ID_TOKEN } });
check('POST /api/v1/auth/google -> 200', auth.status === 200, `HTTP ${auth.status}`);
expectFields('  AuthTokenResponse fields', auth.body, ['accessToken', 'tokenType', 'profileCompleted']);
const token = auth.body?.accessToken;

// --- GET /api/v1/me -----------------------------------------------------------
const me = await call('GET', '/api/v1/me', { token });
check('GET /api/v1/me -> 200', me.status === 200, `HTTP ${me.status}`);
// Frontend CurrentUser type.
expectFields('  CurrentUser fields', me.body, [
  'id',
  'email',
  'name',
  'profileCompleted',
  'timezone',
  'profile',
  'targets',
]);
if (me.body?.profile) {
  expectFields('  CurrentUser.profile fields', me.body.profile, [
    'heightCm',
    'weightKg',
    'activityLevel',
    'goalMode',
  ]);
}

// --- PUT /api/v1/me/profile ---------------------------------------------------
const profileUpdate = await call('PUT', '/api/v1/me/profile', {
  token,
  body: {
    heightCm: 174,
    weightKg: 72,
    activityLevel: 'MEDIUM',
    goalMode: 'LOSS',
    targets: [
      { targetType: 'TARGET_WEIGHT', targetValue: 68, dueDate: null },
      { targetType: 'DAILY_CALORIES', targetValue: 2000, dueDate: null },
      { targetType: 'DAILY_PROTEIN', targetValue: 150, dueDate: null },
    ],
  },
});
check('PUT /api/v1/me/profile -> 200', profileUpdate.status === 200, `HTTP ${profileUpdate.status}`);
check(
  '  profileCompleted flips to true',
  profileUpdate.body?.profileCompleted === true,
  `got ${profileUpdate.body?.profileCompleted}`,
);
const target = profileUpdate.body?.targets?.[0];
if (target) expectFields('  NutritionTarget fields', target, ['targetType', 'targetValue', 'dueDate']);

// --- GET /api/v1/foods --------------------------------------------------------
const foods = await call('GET', '/api/v1/foods?query=%EB%8B%AD', { token });
check('GET /api/v1/foods?query -> 200', foods.status === 200, `HTTP ${foods.status}`);
check('  returns an array', Array.isArray(foods.body));
let food = (foods.body ?? [])[0];
if (!food) {
  const created = await call('POST', '/api/v1/foods', {
    token,
    body: {
      name: '닭가슴살',
      servingAmount: 100,
      servingUnit: 'g',
      caloriesKcal: 165,
      carbohydratesG: 0,
      proteinG: 31,
      fatG: 3.6,
    },
  });
  check('POST /api/v1/foods -> 201', created.status === 201, `HTTP ${created.status}`);
  food = created.body;
}
expectFields('  Food fields', food, [
  'id',
  'name',
  'servingAmount',
  'servingUnit',
  'caloriesKcal',
  'carbohydratesG',
  'proteinG',
  'fatG',
]);

// --- POST /api/v1/meals -------------------------------------------------------
const now = new Date();
const isoToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

// The app always sends eatenAt: null; confirm the backend accepts that.
const createdMeal = await call('POST', '/api/v1/meals', {
  token,
  body: {
    mealDate: isoToday,
    mealType: 'LUNCH',
    eatenAt: null,
    items: [{ foodId: food.id, amount: 200 }],
  },
});
check('POST /api/v1/meals (eatenAt: null) -> 201', createdMeal.status === 201, `HTTP ${createdMeal.status}`);
expectFields('  Meal fields', createdMeal.body, [
  'id',
  'mealDate',
  'mealType',
  'eatenAt',
  'items',
  'totalCaloriesKcal',
  'totalCarbohydratesG',
  'totalProteinG',
  'totalFatG',
]);
const item = createdMeal.body?.items?.[0];
if (item) {
  expectFields('  MealItem fields', item, [
    'id',
    'foodId',
    'foodName',
    'amount',
    'unit',
    'caloriesKcal',
    'carbohydratesG',
    'proteinG',
    'fatG',
  ]);
}
// 200 g against a 100 g / 165 kcal basis.
check(
  '  server computes 200g -> 330 kcal',
  Number(createdMeal.body?.totalCaloriesKcal) === 330,
  `got ${createdMeal.body?.totalCaloriesKcal}`,
);
check(
  '  numeric fields parse as JS numbers',
  Number.isFinite(Number(createdMeal.body?.totalProteinG)),
  `totalProteinG=${createdMeal.body?.totalProteinG}`,
);

// --- GET /api/v1/meals?date= --------------------------------------------------
const journal = await call('GET', `/api/v1/meals?date=${isoToday}`, { token });
check('GET /api/v1/meals?date -> 200', journal.status === 200, `HTTP ${journal.status}`);
expectFields('  MealJournal fields', journal.body, [
  'mealDate',
  'meals',
  'totalCaloriesKcal',
  'totalCarbohydratesG',
  'totalProteinG',
  'totalFatG',
]);

// --- Endpoints the UI no longer reaches, but the client still exports ---------
const mealId = createdMeal.body?.id;
const updated = await call('PUT', `/api/v1/meals/${mealId}`, {
  token,
  body: { mealDate: isoToday, mealType: 'DINNER', eatenAt: null, items: [{ foodId: food.id, amount: 100 }] },
});
check('PUT /api/v1/meals/{id} -> 200 (unused by UI)', updated.status === 200, `HTTP ${updated.status}`);

const removed = await call('DELETE', `/api/v1/meals/${mealId}`, { token });
check('DELETE /api/v1/meals/{id} -> 204 (unused by UI)', removed.status === 204, `HTTP ${removed.status}`);

// --- Auth enforcement ---------------------------------------------------------
const noAuth = await call('GET', '/api/v1/me');
check('GET /api/v1/me without token -> 401', noAuth.status === 401, `HTTP ${noAuth.status}`);

console.log(failed ? '\nRESULT: FAIL' : '\nRESULT: ALL CONTRACTS MATCH');
process.exit(failed ? 1 : 0);
