import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRawCapture } from '../src/rawCapture.ts';

const capture = { rawUri: 'file:///tmp/zine-raw/1.dng', previewUri: 'file:///tmp/zine-raw/1.jpg', rawType: 'bayer', iso: 32, shutterSeconds: 1 / 250, width: 1800, height: 2400 };

test('RAW bridge accepts Bayer DNG with actual exposure values and supports cancellation', () => {
  assert.deepEqual(parseRawCapture(capture), capture);
  assert.equal(parseRawCapture(null), null);
});
test('RAW bridge rejects ProRAW, processed-only results, invalid settings, and remote files', () => {
  for (const invalid of [undefined, {}, { ...capture, rawType: 'proraw' }, { ...capture, rawUri: 'file:///image.jpg' }, { ...capture, rawUri: 'https://example.com/image.dng' }, { ...capture, iso: NaN }, { ...capture, shutterSeconds: 0 }, { ...capture, width: Infinity }]) {
    assert.throws(() => parseRawCapture(invalid));
  }
});
