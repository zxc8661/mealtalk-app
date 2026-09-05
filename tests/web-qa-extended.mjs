/**
 * Drives the running Expo web app through the paths the happy-path QA leaves
 * alone: the profile form, dated records away from today, removing a photo from
 * an existing record, and the memo bound.
 *
 * It is a script rather than a unit test for the same reason as web-qa.mjs: it
 * exercises the real screens against the real on-device database.
 */
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

import { makePng } from './make-png.mjs';

const BASE = process.env.QA_BASE_URL ?? 'http://localhost:8083';
const OUT = process.env.QA_OUT ?? '.omo/evidence/local-app-qa-extended';

mkdirSync(OUT, { recursive: true });

const failures = [];
function check(name, condition) {
  if (condition) {
    console.log(`PASS ${name}`);
  } else {
    failures.push(name);
    console.log(`FAIL ${name}`);
  }
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
const consoleErrors = [];
page.on('pageerror', (error) => consoleErrors.push(error.message));

const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
const body = () => page.locator('body').innerText();
const addButton = () => page.getByRole('button', { name: '기록 추가하기' }).first();

/** Waits for the visible text the user reads, not for a spinner to vanish. */
const seeText = (text, timeout = 30_000) =>
  page.waitForFunction((needle) => document.body.innerText.includes(needle), text, { timeout });

try {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await addButton().waitFor({ timeout: 60_000 });

  // ---- Profile: save, persist across a reload, and refuse a bad measurement.
  await page.goto(`${BASE}/profile`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '프로필 수정' }).click();
  await page.getByLabel('이름').waitFor({ timeout: 30_000 });

  await page.getByLabel('이름').fill('테스트 사용자');
  await page.getByLabel('키').fill('173.5');
  await page.getByLabel('현재 체중').fill('68');
  await page.getByRole('radio', { name: '가벼움' }).click();
  await page.getByRole('button', { name: '변경 내용 저장' }).click();

  await seeText('테스트 사용자');
  check('프로필을 저장하면 조회 화면에 반영된다', (await body()).includes('테스트 사용자'));
  check('저장한 키가 단위와 함께 보인다', (await body()).includes('173.5'));
  check('저장한 체중이 보인다', (await body()).includes('68'));
  await shot('e01-profile-saved');

  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '프로필 수정' }).waitFor({ timeout: 30_000 });
  check('프로필은 새로고침 후에도 남아 있다', (await body()).includes('테스트 사용자'));

  await page.getByRole('button', { name: '프로필 수정' }).click();
  await page.getByLabel('키').waitFor({ timeout: 30_000 });
  check('수정 화면이 저장된 값을 다시 불러온다', (await page.getByLabel('키').inputValue()) === '173.5');

  await page.getByLabel('키').fill('-5');
  await page.getByRole('button', { name: '변경 내용 저장' }).click();
  await seeText('입력값을 확인해주세요');
  check('음수 키는 저장되지 않는다', (await body()).includes('0보다 큰 키를 입력하거나 비워 두세요'));
  check('검증 실패 시 수정 화면에 머무른다', await page.getByLabel('키').isVisible());
  await shot('e02-profile-invalid');

  // A blank measurement is "not recorded", not an error.
  await page.getByLabel('키').fill('');
  await page.getByRole('button', { name: '변경 내용 저장' }).click();
  await seeText('프로필 수정');
  check('키를 비워도 저장된다', !(await body()).includes('입력값을 확인해주세요'));
  await shot('e03-profile-blank-measure');

  // ---- A record on a past date, reached the way a user reaches it.
  await page.goto(`${BASE}/journal`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '이전 날짜' }).waitFor({ timeout: 30_000 });
  const todayLabel = (await page.locator('body').innerText()).match(/(\d+월 \d+일)/)?.[1] ?? '';
  await page.getByRole('button', { name: '이전 날짜' }).click();
  const pastLabel = (await page.locator('body').innerText()).match(/(\d+월 \d+일)/)?.[1] ?? '';
  check('이전 날짜로 이동하면 날짜가 바뀐다', pastLabel !== '' && pastLabel !== todayLabel);
  check('과거 날짜에는 오늘로 이동 버튼이 나온다', await page.getByRole('button', { name: '오늘로 이동' }).isVisible());

  await addButton().click();
  await page.getByText('식사 구분').waitFor({ timeout: 30_000 });
  check('과거 날짜에서 연 기록 화면이 그 날짜를 유지한다', (await body()).includes(pastLabel));

  await page.getByLabel('먹은 음식이나 기분').fill('어제 저녁 된장찌개');
  await page.getByRole('radio', { name: '저녁' }).click();
  await page.getByRole('button', { name: '저장하기' }).click();
  await seeText('기록을 저장했어요');
  check('과거 날짜 기록이 그 날짜로 저장된다', (await body()).includes(pastLabel));
  await shot('e04-past-date-saved');

  await page.getByRole('button', { name: '기록 목록 보기' }).click();
  await seeText('어제 저녁 된장찌개');
  check('과거 날짜 목록에 기록이 보인다', (await body()).includes('어제 저녁 된장찌개'));
  check('과거 기록은 없는 시각을 지어내지 않는다', !/오전 \d|오후 \d/.test(await body()));
  await shot('e05-past-date-journal');

  await page.getByRole('button', { name: '오늘로 이동' }).click();
  await seeText('이 날짜에는 기록이 없어요');
  check('오늘로 이동하면 과거 기록이 섞이지 않는다', !(await body()).includes('어제 저녁 된장찌개'));

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await addButton().waitFor({ timeout: 30_000 });
  check('홈은 과거 날짜 기록을 오늘로 끌어오지 않는다', !(await body()).includes('어제 저녁 된장찌개'));

  // ---- Removing a photo from a record that also has a memo.
  await addButton().click();
  await page.getByText('식사 구분').waitFor({ timeout: 30_000 });
  const chooser = page.waitForEvent('filechooser', { timeout: 30_000 });
  await page.getByRole('button', { name: '앨범에서 고르기' }).click();
  await (await chooser).setFiles({
    name: 'dinner.png',
    mimeType: 'image/png',
    buffer: makePng(1200, 900),
  });
  await page.getByRole('img', { name: '선택한 사진' }).waitFor({ timeout: 30_000 });
  await page.getByLabel('먹은 음식이나 기분').fill('사진과 메모가 모두 있는 기록');
  await page.getByRole('button', { name: '저장하기' }).click();
  await seeText('기록을 저장했어요');

  await page.getByRole('button', { name: '기록 목록 보기' }).click();
  await page.getByRole('button', { name: '수정' }).first().waitFor({ timeout: 30_000 });
  await page.getByRole('button', { name: '수정' }).first().click();
  await page.getByText('식사 구분').waitFor({ timeout: 30_000 });
  check('수정 화면이 저장된 사진을 보여준다', await page.getByRole('img', { name: '선택한 사진' }).isVisible());

  await page.getByRole('button', { name: '사진 빼기' }).click();
  check('사진을 빼면 미리보기가 사라진다', (await page.getByRole('img', { name: '선택한 사진' }).count()) === 0);
  check('메모가 남아 있으면 여전히 저장할 수 있다', await page.getByRole('button', { name: '수정 저장하기' }).isEnabled());
  await shot('e06-photo-removed-in-editor');

  await page.getByRole('button', { name: '수정 저장하기' }).click();
  await seeText('기록을 저장했어요');
  check('사진을 뺀 기록은 메모만 남는다', (await body()).includes('사진과 메모가 모두 있는 기록'));
  // Scoped to what is on screen: the tab navigator keeps an offscreen copy of
  // the journal mounted, and its pre-edit render still holds the old image at
  // display:none until that screen regains focus and re-reads.
  const visiblePhotos = await page.locator('img[alt$="사진"]:visible').count();
  check('사진을 뺀 기록에는 사진이 남지 않는다', visiblePhotos === 0);
  await shot('e07-photo-removed-saved');

  // ---- An edit that would leave nothing behind must be refused.
  await page.getByRole('button', { name: '기록 목록 보기' }).click();
  await page.getByRole('button', { name: '수정' }).first().waitFor({ timeout: 30_000 });
  await page.getByRole('button', { name: '수정' }).first().click();
  await page.getByText('식사 구분').waitFor({ timeout: 30_000 });
  await page.getByLabel('먹은 음식이나 기분').fill('');
  check(
    '메모를 지우고 사진도 없으면 수정 저장을 막는다',
    await page.getByRole('button', { name: '수정 저장하기' }).isDisabled(),
  );
  await shot('e08-empty-edit-blocked');

  // ---- The memo bound is enforced by the field itself.
  await page.getByLabel('먹은 음식이나 기분').fill('가'.repeat(1200));
  const memoLength = (await page.getByLabel('먹은 음식이나 기분').inputValue()).length;
  check('메모는 1000자를 넘겨 입력되지 않는다', memoLength === 1000);
  check('글자 수 안내가 실제 길이를 보여준다', (await body()).includes('1000 / 1000자'));
  await shot('e09-memo-bound');

  check('페이지 예외가 없다', consoleErrors.length === 0);
  if (consoleErrors.length > 0) console.log(consoleErrors.join('\n'));
} catch (error) {
  failures.push(`스크립트 실패: ${error.message}`);
  console.log(`ERROR ${error.message}`);
  await shot('e99-failure');
} finally {
  await browser.close();
}

console.log('');
if (failures.length > 0) {
  console.log(`FAILED ${failures.length}: ${failures.join(', ')}`);
  process.exitCode = 1;
} else {
  console.log('ALL CHECKS PASSED');
}
