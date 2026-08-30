/**
 * Edge-case probes for payloads the UI can actually produce.
 * Each case asserts the backend behaviour the frontend assumes.
 */
const API = process.env.QA_API_URL ?? 'http://localhost:8080';
const ID_TOKEN = process.env.QA_ID_TOKEN ?? 'mealtalk-e2e-id-token';

let failed = false;
const check = (label, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` :: ${detail}` : ''}`);
  if (!ok) failed = true;
};

async function call(method, path, { token, body } = {}) {
  const r = await fetch(`${API}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const t = await r.text();
  let b = null;
  if (t) { try { b = JSON.parse(t); } catch { b = t; } }
  return { status: r.status, body: b };
}

const { body: auth } = await call('POST', '/api/v1/auth/google', { body: { idToken: ID_TOKEN } });
const token = auth.accessToken;

const now = new Date();
const isoToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

// 1. Empty targets: the profile form allows leaving every goal blank.
const emptyTargets = await call('PUT', '/api/v1/me/profile', {
  token,
  body: { heightCm: 174, weightKg: 72, activityLevel: 'MEDIUM', goalMode: 'MAINTAIN', targets: [] },
});
check('empty targets accepted (all goals blank)', emptyTargets.status === 200, `HTTP ${emptyTargets.status}`);
check('  targets come back empty', Array.isArray(emptyTargets.body?.targets) && emptyTargets.body.targets.length === 0);

// 2. Decimal amount: the amount field accepts up to 3 decimals.
const foods = await call('GET', '/api/v1/foods', { token });
const food = (foods.body ?? [])[0];
const decimal = await call('POST', '/api/v1/meals', {
  token,
  body: { mealDate: isoToday, mealType: 'SNACK', eatenAt: null, items: [{ foodId: food.id, amount: 12.345 }] },
});
check('3-decimal amount accepted', decimal.status === 201, `HTTP ${decimal.status}`);
if (decimal.body?.id) await call('DELETE', `/api/v1/meals/${decimal.body.id}`, { token });

// 3. Four decimals must be rejected, matching the client-side rule.
const tooPrecise = await call('POST', '/api/v1/meals', {
  token,
  body: { mealDate: isoToday, mealType: 'SNACK', eatenAt: null, items: [{ foodId: food.id, amount: 1.2345 }] },
});
check('4-decimal amount rejected (matches client rule)', tooPrecise.status === 400, `HTTP ${tooPrecise.status}`);

// 4. Every meal type the picker offers must be valid.
for (const mealType of ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK']) {
  const r = await call('POST', '/api/v1/meals', {
    token,
    body: { mealDate: isoToday, mealType, eatenAt: null, items: [{ foodId: food.id, amount: 10 }] },
  });
  check(`mealType ${mealType} accepted`, r.status === 201, `HTTP ${r.status}`);
  if (r.body?.id) await call('DELETE', `/api/v1/meals/${r.body.id}`, { token });
}

// 5. Every activity/goal choice the picker offers must be valid.
for (const activityLevel of ['LOW', 'MEDIUM', 'HIGH']) {
  const r = await call('PUT', '/api/v1/me/profile', {
    token,
    body: { heightCm: 174, weightKg: 72, activityLevel, goalMode: 'MAINTAIN', targets: [] },
  });
  check(`activityLevel ${activityLevel} accepted`, r.status === 200, `HTTP ${r.status}`);
}
for (const goalMode of ['LOSS', 'MAINTAIN', 'GAIN']) {
  const r = await call('PUT', '/api/v1/me/profile', {
    token,
    body: { heightCm: 174, weightKg: 72, activityLevel: 'MEDIUM', goalMode, targets: [] },
  });
  check(`goalMode ${goalMode} accepted`, r.status === 200, `HTTP ${r.status}`);
}

// 6. A future dueDate is required by @Future; the app always sends null.
const pastDue = await call('PUT', '/api/v1/me/profile', {
  token,
  body: {
    heightCm: 174, weightKg: 72, activityLevel: 'MEDIUM', goalMode: 'LOSS',
    targets: [{ targetType: 'TARGET_WEIGHT', targetValue: 68, dueDate: '2020-01-01' }],
  },
});
check('past dueDate rejected by @Future', pastDue.status === 400, `HTTP ${pastDue.status}`);

// 7. Empty items list must be rejected; the UI disables save in that state.
const noItems = await call('POST', '/api/v1/meals', {
  token,
  body: { mealDate: isoToday, mealType: 'LUNCH', eatenAt: null, items: [] },
});
check('empty items rejected (UI disables save)', noItems.status === 400, `HTTP ${noItems.status}`);

// 8. Duplicate foods in one meal must be rejected; the UI filters chosen foods out of results.
const dupe = await call('POST', '/api/v1/meals', {
  token,
  body: {
    mealDate: isoToday, mealType: 'LUNCH', eatenAt: null,
    items: [{ foodId: food.id, amount: 10 }, { foodId: food.id, amount: 20 }],
  },
});
check('duplicate foodId rejected (UI prevents it)', dupe.status === 400, `HTTP ${dupe.status}`);

// 9. Error envelope shape the client reads for its message.
check(
  'error body exposes a message field',
  typeof noItems.body === 'object' && noItems.body !== null && 'message' in noItems.body,
  JSON.stringify(noItems.body)?.slice(0, 120),
);

// 10. A date with no meals returns zeroed totals rather than 404.
const emptyDay = await call('GET', '/api/v1/meals?date=2019-01-01', { token });
check('empty date -> 200 with zero totals', emptyDay.status === 200 && Number(emptyDay.body?.totalCaloriesKcal) === 0, `HTTP ${emptyDay.status} total=${emptyDay.body?.totalCaloriesKcal}`);

// 11. Malformed date must fail cleanly, not 500.
const badDate = await call('GET', '/api/v1/meals?date=not-a-date', { token });
check('malformed date -> 4xx not 500', badDate.status >= 400 && badDate.status < 500, `HTTP ${badDate.status}`);

// 12. Missing date param.
const noDate = await call('GET', '/api/v1/meals', { token });
check('missing date param -> 4xx not 500', noDate.status >= 400 && noDate.status < 500, `HTTP ${noDate.status}`);

console.log(failed ? '\nRESULT: FAIL' : '\nRESULT: ALL EDGE CONTRACTS MATCH');
process.exit(failed ? 1 : 0);
