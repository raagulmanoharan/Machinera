import test from 'node:test';
import assert from 'node:assert/strict';
import { parseEntries, pageAfterRemoval } from '../src/model.ts';

const entry = { id: '1', uri: 'file:///photo.jpg', kind: 'photo', note: 'A quiet morning', createdAt: '2026-10-12T08:00:00Z' };
test('new journals are empty and saved pages round-trip', () => {
  assert.deepEqual(parseEntries(null), []);
  assert.deepEqual(parseEntries(JSON.stringify([entry, { ...entry, id: '2', kind: 'video' }])), [entry, { ...entry, id: '2', kind: 'video' }]);
});
test('invalid storage is rejected instead of silently losing pages', () => {
  for (const raw of ['bad json', '{}', '[null]', JSON.stringify([{ ...entry, kind: 'audio' }]), JSON.stringify([{ ...entry, createdAt: 'invalid' }]), JSON.stringify([entry, entry])]) {
    assert.throws(() => parseEntries(raw));
  }
});
test('removing the last or only page keeps navigation in bounds', () => {
  assert.equal(pageAfterRemoval(3, 3), 2);
  assert.equal(pageAfterRemoval(0, 0), 0);
  assert.equal(pageAfterRemoval(1, 4), 1);
});

test('flat pages preserve their source URI while older journals still load', () => {
  const flat = { ...entry, uri: 'file:///flat.jpg', originalUri: 'file:///source.heic', photoTreatment: 'flat-v1' };
  assert.deepEqual(parseEntries(JSON.stringify([flat])), [flat]);
  assert.deepEqual(parseEntries(JSON.stringify([entry])), [entry]);
  for (const invalid of [{ ...flat, originalUri: '' }, { ...flat, photoTreatment: 'unknown' }, { ...flat, kind: 'video' }]) {
    assert.throws(() => parseEntries(JSON.stringify([invalid])));
  }
});

test('RAW pages round-trip DNG ownership and manual exposure metadata', () => {
  const raw = { ...entry, rawUri: 'file:///zine-media/1.dng', capture: { mode: 'bayer-raw', iso: 32, shutterSeconds: 1 / 250 } };
  assert.deepEqual(parseEntries(JSON.stringify([raw])), [raw]);
  for (const invalid of [{ ...raw, kind: 'video' }, { ...raw, capture: undefined }, { ...raw, rawUri: undefined }, { ...raw, rawUri: 'file:///1.jpg' }, { ...raw, capture: { ...raw.capture, iso: -1 } }, { ...raw, capture: { ...raw.capture, mode: 'proraw' } }]) {
    assert.throws(() => parseEntries(JSON.stringify([invalid])));
  }
});

test('editorial presets and strength persist while legacy flat entries remain compatible', () => {
  const styled = { ...entry, originalUri: 'file:///source.jpg', photoTreatment: 'editorial-v1', lookStrength: 0.75 };
  assert.deepEqual(parseEntries(JSON.stringify([styled])), [styled]);
  for (const invalid of [{ ...styled, lookStrength: -1 }, { ...styled, lookStrength: 2 }, { ...styled, photoTreatment: undefined }]) {
    assert.throws(() => parseEntries(JSON.stringify([invalid])));
  }
});
