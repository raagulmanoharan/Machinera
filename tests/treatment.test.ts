import test from 'node:test';
import assert from 'node:assert/strict';
import { applyFlatTreatment } from '../src/treatment.ts';
import { decodeJpeg, encodeJpeg } from '../src/jpeg.ts';

const gray = (value: number) => new Uint8Array([value, value, value, 255]);

test('flat treatment softens tonal range without crushing blacks or clipping whites', () => {
  const black = applyFlatTreatment(gray(0))[0];
  const white = applyFlatTreatment(gray(255))[0];
  assert.ok(black > 0 && black < 16);
  assert.ok(white < 220 && white > 160);
  assert.ok(applyFlatTreatment(gray(128))[0] < 128);
  let previous = -1;
  for (let value = 0; value < 256; value++) {
    const output = applyFlatTreatment(gray(value));
    assert.equal(output[0], output[1]);
    assert.equal(output[1], output[2]);
    assert.ok(output[0] >= previous, 'brightness ordering must survive');
    previous = output[0];
  }
});

test('muted colour retains hue ordering, alpha, and unchanged source pixels', () => {
  const source = new Uint8Array([40, 180, 80, 123]);
  const output = applyFlatTreatment(source);
  assert.deepEqual(source, new Uint8Array([40, 180, 80, 123]));
  assert.ok(output[1] > output[2] && output[2] > output[0]);
  assert.ok(output[1] - output[0] < 140);
  assert.equal(output[3], 123);
  assert.throws(() => applyFlatTreatment(new Uint8Array(3)));
});

test('JPEG pipeline produces decodable darker pixels without a native Node Buffer global', () => {
  const previousBuffer = globalThis.Buffer;
  // Match Hermes: Buffer is not built in. The encoder must supply its polyfill.
  Reflect.deleteProperty(globalThis, 'Buffer');
  try {
    const data = new Uint8Array(16 * 16 * 4);
    for (let i = 0; i < data.length; i += 4) data.set([160, 160, 160, 255], i);
    const source = encodeJpeg({ width: 16, height: 16, data });
    const decoded = decodeJpeg(source);
    const flatBytes = encodeJpeg({ ...decoded, data: applyFlatTreatment(decoded.data) });
    const flat = decodeJpeg(flatBytes);
    assert.equal(flat.width, 16);
    assert.equal(flat.height, 16);
    assert.ok(flat.data[0] < decoded.data[0] - 10);
    assert.ok(Math.abs(flat.data[0] - applyFlatTreatment(data)[0]) <= 3);
    assert.equal(flat.data[3], 255);
    assert.throws(() => decodeJpeg(new Uint8Array([0, 1, 2])), 'invalid images must not silently pass');
  } finally { globalThis.Buffer = previousBuffer; }
});

test('reference colour styling is selective, adjustable, and leaves source bytes untouched', async () => {
  const { applyPhotoLook } = await import('../src/treatment.ts');
  const input = new Uint8Array([60, 170, 70, 255, 210, 50, 40, 255, 140, 140, 140, 200]);
  const snapshot = input.slice();
  assert.deepEqual(applyPhotoLook(input, 'editorial', 0), input);
  const flat = applyPhotoLook(input, 'flat', 1);
  const styled = applyPhotoLook(input, 'editorial', 1);
  assert.ok(styled[0] > flat[0] && styled[1] < flat[1], 'greens shift toward olive');
  assert.ok(styled[4] > flat[4], 'reds gain depth');
  assert.ok(styled[8] > styled[10], 'neutrals gain gentle warmth');
  assert.equal(styled[11], 200);
  assert.deepEqual(input, snapshot);
  const medium = applyPhotoLook(input, 'editorial', 0.75);
  for (let i = 0; i < input.length; i++) {
    assert.ok(medium[i] >= Math.min(input[i], styled[i]) - 1 && medium[i] <= Math.max(input[i], styled[i]) + 1);
  }
  assert.throws(() => applyPhotoLook(input, 'editorial', NaN));
  assert.throws(() => applyPhotoLook(input, 'editorial', 1.1));
});
