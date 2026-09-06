/**
 * One-off verification for the Home loading optimization.
 * 1. Slow the categories API → skeleton grid + usable Other card must show.
 * 2. Let it resolve → real grid replaces skeletons.
 * 3. Reload the same tab → grid must paint from sessionStorage cache
 *    before the (still slow) network responds.
 */
import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();

// Accept consent up front so we land on the grid.
await page.addInitScript(() => {
  window.localStorage.setItem('resq.consent.accepted', 'true');
});

// Delay only the categories call; health and sessions run at full speed.
const DELAY_MS = 2500;
await context.route('**/api/v1/content/categories?*', async (route) => {
  await new Promise((r) => setTimeout(r, DELAY_MS));
  await route.continue();
});

const problems = [];
page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`));
page.on('pageerror', (e) => problems.push(`uncaught: ${e.message}`));

// --- 1. Cold load: skeletons immediately, no blank screen -----------------
await page.goto('http://localhost:3000/en', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(400); // well before the 2.5s API delay

const skeletons = await page.locator('[aria-busy="true"] > div[aria-hidden]').count();
const otherVisible = await page.getByText('Other problem').isVisible();
const searchVisible = await page.getByRole('searchbox').isVisible();
console.log(`skeletons while loading: ${skeletons}`);
console.log(`Other card usable during load: ${otherVisible}`);
console.log(`search visible during load: ${searchVisible}`);
await page.screenshot({ path: 'screenshots/perf-01-skeleton.png', fullPage: true });

if (skeletons === 0) problems.push('no skeletons while categories pending');
if (!otherVisible) problems.push('Other card not visible during load');

// --- 2. Grid arrives ------------------------------------------------------
await page.getByText('Burn', { exact: true }).waitFor({ timeout: 10_000 });
const cards = await page.locator('a[href*="/assess/"]').count();
console.log(`category cards after load: ${cards}`);
await page.screenshot({ path: 'screenshots/perf-02-loaded.png', fullPage: true });
if (cards < 20) problems.push(`expected 22 category cards, saw ${cards}`);

// --- 3. Reload: cache paints instantly despite the slow network -----------
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(300); // far below the 2.5s delay
const cachedCards = await page.locator('a[href*="/assess/"]').count();
const skeletonsOnReload = await page.locator('div[aria-hidden].animate-pulse').count();
console.log(`cards from cache 300ms after reload: ${cachedCards}`);
console.log(`skeletons on cached reload: ${skeletonsOnReload}`);
await page.screenshot({ path: 'screenshots/perf-03-cached-reload.png', fullPage: true });
if (cachedCards < 20) problems.push(`cache did not paint instantly (${cachedCards} cards)`);

await browser.close();

if (problems.length) {
  console.error('\nFAIL');
  for (const p of problems) console.error(' -', p);
  process.exit(1);
}
console.log('\nPASS — skeleton, load, and cached reload all behave.');
