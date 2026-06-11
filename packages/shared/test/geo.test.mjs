// Run with `pnpm --filter @status/shared test` (builds dist first).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveGeo, detectCc, cleanName, ccToEmoji } from '../dist/index.js';

test('emoji flag in name', () => {
  const r = resolveGeo('🇳🇱 Amsterdam #1');
  assert.equal(r.cc, 'nl');
  assert.equal(r.emoji, '🇳🇱');
  assert.equal(r.name, 'Amsterdam #1');
});

test('english country name', () => {
  assert.equal(detectCc('Germany Frankfurt'), 'de');
  assert.equal(detectCc('Netherlands 02'), 'nl');
});

test('russian country name (stems)', () => {
  assert.equal(detectCc('Нидерланды Амстердам'), 'nl');
  assert.equal(detectCc('Германия 1'), 'de');
  assert.equal(detectCc('Финляндия'), 'fi');
  assert.equal(detectCc('Россия Москва'), 'ru');
});

test('any country flag emoji resolves (Albania)', () => {
  const r = resolveGeo('🇦🇱 Tirana');
  assert.equal(r.cc, 'al');
  assert.equal(r.emoji, '🇦🇱');
  assert.equal(r.name, 'Tirana');
});

test('albania by keyword', () => {
  assert.equal(detectCc('Albania 1'), 'al');
  assert.equal(detectCc('Албания'), 'al');
});

test('iso token detection', () => {
  assert.equal(detectCc('NL-1'), 'nl');
  assert.equal(detectCc('DE | Frankfurt'), 'de');
  assert.equal(detectCc('UK London'), 'gb');
});

test('longest-match resolves india/indiana collision', () => {
  assert.equal(detectCc('Indianapolis node'), 'us');
  assert.equal(detectCc('India Mumbai'), 'in');
});

test('city resolves country', () => {
  assert.equal(detectCc('Tokyo Premium'), 'jp');
  assert.equal(detectCc('Стамбул-3'), 'tr');
});

test('clean name strips code prefix', () => {
  assert.equal(cleanName('NL | Amsterdam', 'nl'), 'Amsterdam');
  assert.equal(cleanName('DE-Frankfurt-1', 'de'), 'Frankfurt-1');
});

test('clean name keeps unknown uppercase prefix', () => {
  assert.equal(cleanName('VPN Server', ''), 'VPN Server');
});

test('ccToEmoji', () => {
  assert.equal(ccToEmoji('us'), '🇺🇸');
  assert.equal(ccToEmoji('gb'), '🇬🇧');
  assert.equal(ccToEmoji(''), '');
});

test('unknown country', () => {
  const r = resolveGeo('Premium Server 42');
  assert.equal(r.cc, '');
  assert.equal(r.emoji, '');
  assert.equal(r.name, 'Premium Server 42');
});
