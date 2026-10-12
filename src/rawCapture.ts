export type RawCapture = {
  rawUri: string;
  previewUri: string;
  rawType: 'bayer';
  iso: number;
  shutterSeconds: number;
  width: number;
  height: number;
};

export function parseRawCapture(value: unknown): RawCapture | null {
  if (value === null) return null; // Native camera cancellation.
  if (!value || typeof value !== 'object') throw new Error('The RAW camera returned no capture.');
  const capture = value as Record<string, unknown>;
  if (capture.rawType !== 'bayer' ||
    typeof capture.rawUri !== 'string' || !capture.rawUri.startsWith('file://') || !capture.rawUri.endsWith('.dng') ||
    typeof capture.previewUri !== 'string' || !capture.previewUri.startsWith('file://') || !capture.previewUri.endsWith('.jpg') ||
    !isPositive(capture.iso) || !isPositive(capture.shutterSeconds) ||
    !isPositive(capture.width) || !isPositive(capture.height)) {
    throw new Error('The camera did not return a valid Bayer RAW capture. No processed photo was substituted.');
  }
  return capture as RawCapture;
}
function isPositive(value: unknown) { return typeof value === 'number' && Number.isFinite(value) && value > 0; }
