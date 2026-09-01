import pkg from '../e2e/node_modules/playwright/index.js';
const { chromium } = pkg;
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const html = path.join(dir, 'RESQ-Architecture-Interview.html');
const out = path.join(dir, 'RESQ-Architecture-Interview.pdf');

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`file://${html}`, { waitUntil: 'load' });
await page.emulateMedia({ media: 'print' });
await page.pdf({
  path: out,
  format: 'A4',
  printBackground: true,
  margin: { top: '10mm', bottom: '12mm', left: '10mm', right: '10mm' },
});
await browser.close();
console.log(out);
