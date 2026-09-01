/**
 * Browser smoke test for the full user journey.
 *
 * Optional, and separate from `make test`: it needs both servers running and a
 * Chromium download, which is too much to ask of every run. It exists because
 * the unit and integration suites cannot see whether the screens actually work
 * in a browser.
 *
 *   npm install && npm run setup   # downloads Chromium into ./browsers
 *   npm run smoke
 *
 * Screenshots of every step land in ./screenshots.
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const problems = [];
const steps = [];

function watch(page, tag) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') problems.push(`[${tag}] console error: ${msg.text()}`);
  });
  page.on('pageerror', (error) => {
    problems.push(`[${tag}] uncaught: ${error.message}`);
  });
}

async function record(page, name) {
  await page.screenshot({ path: `./screenshots/${name}.png`, fullPage: true });
  steps.push(name);
}

function check(condition, message) {
  if (!condition) problems.push(message);
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 420, height: 900 } });

// ---------------------------------------------------------------- English
const page = await context.newPage();
watch(page, 'en');

await page.goto(`${BASE}/en`, { waitUntil: 'networkidle' });
check(page.url().includes('/consent'), 'first visit was not sent to the consent screen');
await record(page, '01-consent-en');

await page.getByRole('button', { name: /I understand/i }).click();
await page.waitForURL('**/en');
await page.waitForSelector('text=Burn', { timeout: 20000 });
await record(page, '02-landing-en');

await page.getByRole('link', { name: /Burn/ }).first().click();
await page.waitForSelector('text=How old is the injured person?');
await page.getByRole('button', { name: /Child \(1/ }).click();
await page.getByRole('button', { name: /Continue/ }).click();

await page.waitForSelector('text=/trouble breathing/i');
await record(page, '03-question-en');

// Answers that trigger the hard rule: this must come back CRITICAL from
// verified content, without an AI call.
await page.getByRole('button', { name: /Struggling to breathe/ }).click();
await page.getByRole('button', { name: /Continue/ }).click();
for (const option of [/Face, neck, or mouth/, /Larger than their palm/, /White, leathery/]) {
  await page.getByRole('button', { name: option }).click();
  await page.getByRole('button', { name: /Continue/ }).click();
}
await page.waitForSelector('text=Add a photo');
await page.getByRole('button', { name: /Get first-aid steps/ }).click();

await page.waitForURL('**/result/**', { timeout: 30000 });
// Wait on the steps heading rather than a word like "emergency", which also
// appears in the footer disclaimer and would match while still loading.
await page.waitForSelector('text=Do this now', { timeout: 20000 });
await record(page, '04-result-critical-en');

const criticalText = await page.innerText('body');
check(/Call 112/.test(criticalText), 'critical result is missing the 112 button');
check(
  /Emergency rules applied/.test(criticalText),
  'critical result is missing the rules notice'
);
check(
  !/[\u0900-\u097F]/.test(criticalText.replace(/हिंदी/g, '')),
  'Hindi text appeared on the English result screen'
);

// Switching language on a stored result must not silently translate it.
await page.getByRole('button', { name: 'हिंदी' }).click();
await page.waitForURL('**/hi/result/**');
await page.waitForSelector('text=/तैयार किया गया था/', { timeout: 20000 });
await record(page, '05-result-language-notice-hi');

// ------------------------------------------------------------------ Hindi
const hindi = await context.newPage();
watch(hindi, 'hi');

await hindi.goto(`${BASE}/hi`, { waitUntil: 'networkidle' });
await hindi.waitForSelector('text=जलना', { timeout: 20000 });
await record(hindi, '06-landing-hi');

await hindi.getByRole('link', { name: /अन्य समस्या/ }).click();
await hindi.waitForSelector('textarea');
// The trigger forces the AI to fail, so this also proves the degraded path.
await hindi.fill('textarea', '__mock_fail__ मेरे भाई का हाथ गरम तेल से जल गया है');
await hindi.getByRole('button', { name: /वयस्क/ }).click();
await hindi.getByRole('button', { name: /फ़र्स्ट-एड क़दम देखें/ }).click();

await hindi.waitForURL('**/result/**', { timeout: 30000 });
await hindi.waitForSelector('text=/अभी यह करें/', { timeout: 20000 });
await record(hindi, '07-result-degraded-hi');

const hindiText = await hindi.innerText('body');
check(
  /जांचे हुए बुनियादी क़दम/.test(hindiText),
  'the Hindi result is missing the degraded-mode notice'
);

// The strictest check in the file: no English may reach a Hindi screen, from
// the UI, the content files or the AI. Only the brand, the language toggle and
// source acronyms are allowed. Icons are inline SVG, so they contribute no text.
const unexpectedLatin = [
  ...new Set(hindiText.replace(/RESQ|EN|NHS|CPR|WHO/g, '').match(/[A-Za-z]{3,}/g) ?? []),
];
check(
  unexpectedLatin.length === 0,
  `English text on the Hindi result screen: ${unexpectedLatin.join(', ')}`
);

await browser.close();

console.log(`captured ${steps.length} screens in ./screenshots`);
if (problems.length === 0) {
  console.log('smoke test passed');
  process.exit(0);
}
console.log('\nproblems:');
for (const problem of problems) console.log(`  - ${problem}`);
process.exit(1);
