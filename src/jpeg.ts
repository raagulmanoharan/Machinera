import { Buffer } from 'buffer';
import jpeg from 'jpeg-js';

export function decodeJpeg(bytes: Uint8Array) {
  return jpeg.decode(bytes, { useTArray: true, formatAsRGBA: true, tolerantDecoding: false, maxResolutionInMP: 3, maxMemoryUsageInMB: 128 });
}
export function encodeJpeg(image: { width: number; height: number; data: Uint8Array }) {
  // jpeg-js's CommonJS encoder expects Buffer; Hermes does not provide Node globals.
  if (typeof globalThis.Buffer === 'undefined') globalThis.Buffer = Buffer as typeof globalThis.Buffer;
  return new Uint8Array(jpeg.encode(image, 92).data);
}
