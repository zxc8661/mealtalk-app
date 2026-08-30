/**
 * Manual QA driver for the Expo web build.
 *
 * Walks the guide's flow against a real backend running the `e2e` profile:
 * 프로필 설정 -> 홈 -> 식단 추가 -> 식품 검색/선택 -> 섭취량 -> 저장 -> 홈 반영 -> 식단 목록 -> 프로필.
 *
 *   npx expo start --web --port 8086
 *   node scripts/qa-flow.mjs
 */
import { mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

const BASE = process.env.QA_BASE_URL ?? 'http://localhost:8086';
const API = process.env.QA_API_URL ?? 'http://localhost:8080';
const ID_TOKEN = process.env.QA_ID_TOKEN ?? 'mealtalk-e2e-id-token';
const SESSION_KEY = 'mealtalk.access-token';
const OUT = 'qa-shots';
mkdirSync(OUT, { recursive: true });

let failed = false;
const check = (label, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` :: ${detail}` : ''}`);
  if (!ok) failed = true;
};

async function api(path, options = {}, token) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  return { status: response.status, body: response.status === 204 ? null : await response.json().catch(() => null) };
}

// 1. Fixture sign-in.
const signIn = await api('/api/v1/auth/google', {
  method: 'POST',
  body: JSON.stringify({ idToken: ID_TOKEN }),
});
if (signIn.status !== 200 || !signIn.body?.accessToken) {
  console.error(`FAIL  fixture sign-in -> HTTP ${signIn.status}`);
  process.exit(1);
}
const token = signIn.body.accessToken;
check('fixture sign-in', true);

// 2. Reset this fixture user to a first-run state so the onboarding gate is exercised
// on every run. There is no reset endpoint, so clear the profile in the database.
if (process.env.QA_SKIP_DB_RESET !== 'true') {
  const sql = [
    "DELETE FROM user_targets WHERE user_id IN (SELECT id FROM users WHERE email = 'e2e@mealtalk.test');",
    "DELETE FROM user_profiles WHERE user_id IN (SELECT id FROM users WHERE email = 'e2e@mealtalk.test');",
    "UPDATE users SET profile_completed = false WHERE email = 'e2e@mealtalk.test';",
  ].join(' ');
  const reset = spawnSync(
    'docker',
    ['exec', process.env.QA_DB_CONTAINER ?? 'mealtalk-postgres', 'psql', '-U', 'mealtalk', '-d', 'mealtalk', '-c', sql],
    { encoding: 'utf8' },
  );
  check('reset fixture profile', reset.status === 0, (reset.stderr ?? '').trim().split('\n')[0]);
}

const today = new Date();
const isoToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
const existing = await api(`/api/v1/meals?date=${isoToday}`, {}, token);
for (const meal of existing.body?.meals ?? []) {
  await api(`/api/v1/meals/${meal.id}`, { method: 'DELETE' }, token);
}

// Ensure at least one food exists to search for.
const foods = await api('/api/v1/foods', {}, token);
let chicken = (foods.body ?? []).find((food) => food.name === '닭가슴살');
if (!chicken) {
  const created = await api(
    '/api/v1/foods',
    {
      method: 'POST',
      body: JSON.stringify({
        name: '닭가슴살',
        servingAmount: 100,
        servingUnit: 'g',
        caloriesKcal: 165,
        carbohydratesG: 0,
        proteinG: 31,
        fatG: 3.6,
      }),
    },
    token,
  );
  chicken = created.body;
}
check('seed food available', Boolean(chicken?.id), chicken?.name);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });

const errors = [];
page.on('pageerror', (error) => errors.push(String(error)));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text().slice(0, 200));
});

await page.addInitScript(
  ([key, value]) => window.localStorage.setItem(key, value),
  [SESSION_KEY, token],
);

const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });

/**
 * Only the on-screen text. The tab navigator keeps inactive screens mounted but
 * hidden, so reading the raw body would assert against screens the user cannot see.
 */
const text = () =>
  page.evaluate(() => {
    const visible = (element) => {
      const style = window.getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      return element.getClientRects().length > 0;
    };
    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
      if (node.nodeType !== Node.ELEMENT_NODE) return '';
      if (!visible(node)) return '';
      return [...node.childNodes].map(walk).join(' ');
    };
    return walk(document.body).replace(/\s+/g, ' ').trim();
  });

// 3. Boot. A profile-less user must land on 프로필 설정.
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await page.getByRole('heading', { name: '프로필 설정' }).first().waitFor({ timeout: 20000 });
check('P-02 onboarding gate', (await text()).includes('프로필 설정'));
await shot('01-onboarding');

// 4. Fill the profile and start.
await page.getByLabel('키').fill('174');
await page.getByLabel('현재 체중').fill('72');
await page.getByLabel('목표 칼로리 (선택)').fill('2000');
await page.getByLabel('목표 단백질 (선택)').fill('150');
await page.getByRole('radio', { name: '감량' }).click();
await page.getByRole('button', { name: '시작하기' }).click();

// 5. Home.
await page
  .getByRole('heading', { name: '오늘 등록한 식단' })
  .filter({ visible: true })
  .first()
  .waitFor({ timeout: 20000 });
const home = await text();
check('P-03 home reached', home.includes('오늘 등록한 식단'));
check('home shows calorie target', home.includes('2,000'), home.match(/\/ [\d,]+ kcal/)?.[0]);
check('home starts empty', home.includes('아직 기록한 식단이 없어요'));
await shot('02-home-empty');

// 6. Meal entry.
await page.getByRole('button', { name: '식단 추가하기' }).first().click();
await page.getByRole('heading', { name: '식품 검색' }).first().waitFor({ timeout: 20000 });
check('P-04 meal entry reached', (await text()).includes('선택한 식품'));

await page.getByLabel('식품 이름').fill('닭가슴살');
await page.getByRole('button', { name: '검색', exact: true }).click();
await page.getByRole('button', { name: '닭가슴살 추가' }).first().click({ timeout: 20000 });

// 200 g of a 100 g / 165 kcal basis must preview as 330 kcal.
await page.getByLabel('닭가슴살 섭취량').fill('200');
await page.waitForFunction(
  () => document.body.innerText.includes('330 kcal'),
  null,
  { timeout: 10000 },
);
check('amount recalculates preview (200g -> 330 kcal)', true);
await shot('03-meal-entry');

await page.getByRole('button', { name: '저장하기' }).click();

// 7. Save result, computed by the server.
await page.getByText('식단을 저장했어요').waitFor({ timeout: 20000 });
const saved = await text();
check('save result screen', saved.includes('식단을 저장했어요'));
check('save result shows server total', saved.includes('330 kcal'), saved.match(/[\d,]+ kcal/)?.[0]);
await shot('04-saved');

// 8. Home reflects the new meal.
// The tab navigator keeps both screens mounted, so assert on the visible one.
await page.getByRole('button', { name: '홈에서 확인하기' }).click();
await page
  .getByRole('heading', { name: '오늘 등록한 식단' })
  .filter({ visible: true })
  .first()
  .waitFor({ timeout: 20000 });
const homeAfter = await text();
check('home reflects saved meal', homeAfter.includes('닭가슴살'));
check('home total updated', homeAfter.includes('330'), homeAfter.match(/[\d,]+\s*\/\s*[\d,]+ kcal/)?.[0]);

// The web tab bar floats over the content; it must not cover the date heading.
const overlap = await page.evaluate(() => {
  const headings = [...document.querySelectorAll('h1')].filter((el) => el.getClientRects().length);
  const dateEl = headings.find((el) => /월 .*일/.test(el.textContent ?? ''));
  const tabList = document.querySelector('[role="tablist"]');
  if (!dateEl || !tabList) return null;
  const a = dateEl.getBoundingClientRect();
  const b = tabList.getBoundingClientRect();
  const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return Math.round(Math.min(x, y));
});
check('tab bar does not cover the date', overlap === null || overlap <= 0, `overlap=${overlap}px`);
await shot('05-home-updated');

// 9. Journal tab.
await page.goto(`${BASE}/journal`, { waitUntil: 'networkidle' });
await page.getByRole('heading', { name: '하루 합계' }).filter({ visible: true }).first().waitFor({ timeout: 20000 });
const journal = await text();
check('P-05 journal totals', journal.includes('하루 합계'));
check('P-05 lists the meal', journal.includes('닭가슴살'));
await shot('06-journal');

await page.getByRole('button', { name: '이전 날짜' }).click();
await page.waitForFunction(() => document.body.innerText.includes('기록된 식단이 없어요'), null, { timeout: 10000 });
check('journal empty on another date', true);

// 10. Profile.
await page.goto(`${BASE}/profile`, { waitUntil: 'networkidle' });
await page.getByRole('heading', { name: '신체 정보' }).filter({ visible: true }).first().waitFor({ timeout: 20000 });
const profile = await text();
check('P-06 keeps entered height', profile.includes('174'));
check('P-06 keeps calorie target', profile.includes('2,000 kcal'));
check('P-06 goal type saved', profile.includes('감량'));
await shot('07-profile');

check('no uncaught page errors', errors.length === 0, errors.slice(0, 2).join(' | '));

await browser.close();
console.log(failed ? '\nRESULT: FAIL' : '\nRESULT: ALL PASS');
process.exit(failed ? 1 : 0);
