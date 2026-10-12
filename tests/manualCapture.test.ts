import test from 'node:test';
import assert from 'node:assert/strict';
import { parseManualCapture } from '../src/manualCapture.ts';
import { parseEntries } from '../src/model.ts';

const photo = { photoUri: 'file:///tmp/zine-camera/1.jpg', mode: 'manual-photo', iso: 32, shutterSeconds: 1 / 250, width: 4032, height: 3024 };
test('manual JPEG capture does not require RAW support or a DNG', () => {
  assert.deepEqual(parseManualCapture(photo), photo);
  assert.equal(parseManualCapture(null), null);
  const entry = { id: '1', uri: photo.photoUri, kind: 'photo', note: '', createdAt: '2026-10-12T08:00:00Z', capture: { mode: photo.mode, iso: photo.iso, shutterSeconds: photo.shutterSeconds } };
  assert.deepEqual(parseEntries(JSON.stringify([entry])), [entry]);
});
test('manual camera rejects invalid image types, remote results, and exposure values', () => {
  for (const invalid of [{ ...photo, photoUri: 'file:///1.dng' }, { ...photo, photoUri: 'https://example.com/1.jpg' }, { ...photo, iso: 0 }, { ...photo, shutterSeconds: NaN }, { ...photo, mode: 'unprocessed' }]) assert.throws(() => parseManualCapture(invalid));
});
