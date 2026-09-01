// Fails the build if the two message files drift apart, which is what stops a
// missing Hindi translation from silently rendering English.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const messagesDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'messages');

function load(locale) {
  return JSON.parse(readFileSync(join(messagesDir, `${locale}.json`), 'utf8'));
}

function flatten(value, prefix = '') {
  return Object.entries(value).flatMap(([key, entry]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof entry === 'object' && entry !== null
      ? flatten(entry, path)
      : [path];
  });
}

function placeholders(text) {
  return [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}

function valueAt(object, path) {
  return path.split('.').reduce((node, key) => node[key], object);
}

const en = load('en');
const hi = load('hi');
const enKeys = flatten(en).sort();
const hiKeys = flatten(hi).sort();

test('both locales define exactly the same keys', () => {
  const missingInHindi = enKeys.filter((key) => !hiKeys.includes(key));
  const missingInEnglish = hiKeys.filter((key) => !enKeys.includes(key));

  assert.deepEqual(missingInHindi, [], 'keys missing from hi.json');
  assert.deepEqual(missingInEnglish, [], 'keys missing from en.json');
});

test('placeholders match for every key', () => {
  for (const key of enKeys) {
    assert.deepEqual(
      placeholders(valueAt(hi, key)),
      placeholders(valueAt(en, key)),
      `placeholder mismatch in "${key}"`
    );
  }
});

test('no message is empty', () => {
  for (const key of enKeys) {
    assert.ok(valueAt(en, key).trim().length > 0, `empty en value: ${key}`);
    assert.ok(valueAt(hi, key).trim().length > 0, `empty hi value: ${key}`);
  }
});

test('hindi values are actually translated, not copied from english', () => {
  // A handful of values are legitimately identical in both files (brand name,
  // the deliberate cross-language labels, and error codes used as keys).
  const allowedIdentical = new Set([
    'common.appName',
    'landing.otherLabelAlt',
    'common.switchTo',
  ]);

  const untranslated = enKeys.filter(
    (key) =>
      !allowedIdentical.has(key) && valueAt(en, key) === valueAt(hi, key)
  );

  assert.deepEqual(untranslated, [], 'hi.json values identical to en.json');
});

test('hindi values use devanagari script', () => {
  const latinOnly = enKeys.filter((key) => {
    if (key === 'common.appName' || key === 'landing.otherLabelAlt') return false;
    if (key === 'common.switchTo') return false;
    return !/[\u0900-\u097F]/.test(valueAt(hi, key));
  });

  assert.deepEqual(latinOnly, [], 'hi.json values without Devanagari');
});
