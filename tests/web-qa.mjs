/**
 * Drives the running Expo web app as a user would: create a memo record, edit
 * it, and delete it, asserting on what the screen actually shows.
 *
 * It is a script rather than a unit test because it exercises the real screens
 * against the real on-device database, which no mock can stand in for.
 */
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

import { makePng } from './make-png.mjs';

const BASE = process.env.QA_BASE_URL ?? 'http://localhost:8083';
const OUT = process.env.QA_OUT ?? '.omo/evidence/local-app-qa';

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

try {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '기록 추가하기' }).first().waitFor({ timeout: 60_000 });

  check('홈이 로그인 없이 바로 열린다', (await body()).includes('오늘'));
  check('홈에 칼로리 합계가 없다', !(await body()).includes('kcal'));
  check('첫 실행은 빈 상태를 보여준다', (await body()).includes('아직 오늘 기록이 없어요'));
  await shot('01-home-empty');

  await page.getByRole('button', { name: '기록 추가하기' }).first().click();
  await page.getByText('식사 구분').waitFor({ timeout: 30_000 });
  check('기록 추가 화면에 식품 검색이 없다', !(await body()).includes('식품 검색'));

  const save = page.getByRole('button', { name: '저장하기' });
  check('메모도 사진도 없으면 저장할 수 없다', await save.isDisabled());
  await shot('02-entry-empty-disabled');

  const memo = page.getByLabel('먹은 음식이나 기분');
  await memo.fill('점심에 김치찌개랑 계란말이');
  check('메모를 쓰면 저장할 수 있다', await save.isEnabled());
  await save.click();

  await page.getByText('기록을 저장했어요').waitFor({ timeout: 30_000 });
  check('저장 결과가 메모를 그대로 보여준다', (await body()).includes('점심에 김치찌개랑 계란말이'));
  check('저장 결과에 칼로리가 없다', !(await body()).includes('kcal'));
  await shot('03-saved');

  await page.getByRole('button', { name: '기록 목록 보기' }).click();
  await page.getByRole('button', { name: '수정' }).first().waitFor({ timeout: 30_000 });
  check('목록에 저장한 기록이 보인다', (await body()).includes('점심에 김치찌개랑 계란말이'));
  await shot('04-journal');

  await page.getByRole('button', { name: '수정' }).first().click();
  await page.getByText('식사 구분').waitFor({ timeout: 30_000 });
  const editMemo = page.getByLabel('먹은 음식이나 기분');
  check('수정 화면이 저장된 메모를 불러온다', (await editMemo.inputValue()).includes('김치찌개'));
  await editMemo.fill('수정한 메모');
  await page.getByRole('button', { name: '수정 저장하기' }).click();
  await page.getByText('기록을 저장했어요').waitFor({ timeout: 30_000 });
  check('수정한 내용이 저장된다', (await body()).includes('수정한 메모'));
  await shot('05-edited');

  await page.getByRole('button', { name: '기록 목록 보기' }).click();
  await page.getByRole('button', { name: '삭제' }).first().waitFor({ timeout: 30_000 });
  await page.getByRole('button', { name: '삭제' }).first().click();
  await page.getByRole('button', { name: '삭제 확인' }).first().click();
  // The tab navigator keeps an offscreen copy of the screen mounted, so the
  // condition is asserted on the visible text the user reads, and awaited until
  // the list has finished re-reading rather than while its spinner is up.
  await page.waitForFunction(
    () => document.body.innerText.includes('이 날짜에는 기록이 없어요'),
    null,
    { timeout: 30_000 },
  );
  check('삭제하면 목록에서 사라진다', !(await body()).includes('수정한 메모'));
  await shot('06-deleted');

  // A photo record, from a real image larger than the stored bound.
  await page.getByRole('button', { name: '기록 추가하기' }).first().click();
  await page.getByText('식사 구분').waitFor({ timeout: 30_000 });

  const chooser = page.waitForEvent('filechooser', { timeout: 30_000 });
  await page.getByRole('button', { name: '앨범에서 고르기' }).click();
  await (await chooser).setFiles({
    name: 'lunch.png',
    mimeType: 'image/png',
    buffer: makePng(2400, 1200),
  });

  const preview = page.getByRole('img', { name: '선택한 사진' });
  await preview.waitFor({ timeout: 30_000 });
  check('고른 사진이 미리보기로 보인다', await preview.isVisible());
  check('사진만 있어도 저장할 수 있다', await page.getByRole('button', { name: '저장하기' }).isEnabled());
  await shot('08-photo-picked');

  await page.getByRole('button', { name: '저장하기' }).click();
  await page.getByText('기록을 저장했어요').waitFor({ timeout: 60_000 });
  const savedPhoto = page.getByRole('img', { name: '점심 사진' });
  await savedPhoto.waitFor({ timeout: 30_000 });
  check('저장된 기록이 사진을 보여준다', await savedPhoto.isVisible());
  check('사진만 있는 기록은 설명을 지어내지 않는다', !(await body()).includes('kcal'));
  await shot('09-photo-saved');

  const stored = await page.evaluate(() =>
    document.querySelector('img[alt="점심 사진"]')?.currentSrc?.slice(0, 30),
  );
  check('사진은 외부 URL이 아니라 기기 데이터로 있다', stored?.startsWith('data:image/jpeg') === true);

  const decoded = await page.evaluate(() => {
    const image = document.querySelector('img[alt="점심 사진"]');
    return image === null ? null : { width: image.naturalWidth, height: image.naturalHeight };
  });
  check(
    '2400px 사진은 저장 전에 2048px 이하로 줄어든다',
    decoded !== null && Math.max(decoded.width, decoded.height) <= 2048 && decoded.width > 0,
  );

  await page.goto(`${BASE}/profile`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '프로필 수정' }).waitFor({ timeout: 30_000 });
  check('프로필에 로그아웃이 없다', !(await body()).includes('로그아웃'));
  check('프로필이 기기 저장임을 알린다', (await body()).includes('이 기기에만 저장됩니다'));
  await shot('07-profile');

  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '프로필 수정' }).waitFor({ timeout: 30_000 });
  check('새로고침 후에도 기록 저장소가 살아 있다', !(await body()).includes('저장소를 열지 못했습니다'));

  check('페이지 예외가 없다', consoleErrors.length === 0);
  if (consoleErrors.length > 0) console.log(consoleErrors.join('\n'));
} finally {
  await browser.close();
}

console.log(failures.length === 0 ? '\nALL CHECKS PASSED' : `\nFAILED: ${failures.join(', ')}`);
process.exit(failures.length === 0 ? 0 : 1);
