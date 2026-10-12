export type ManualCapture = {
  photoUri: string;
  mode: 'manual-photo';
  iso: number;
  shutterSeconds: number;
  width: number;
  height: number;
};

export function parseManualCapture(value: unknown): ManualCapture | null {
  if (value === null) return null;
  if (!value || typeof value !== 'object') throw new Error('The camera returned no capture.');
  const capture = value as Record<string, unknown>;
  const positive = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v > 0;
  if (capture.mode !== 'manual-photo' || typeof capture.photoUri !== 'string' ||
    !capture.photoUri.startsWith('file://') || !capture.photoUri.endsWith('.jpg') ||
    !positive(capture.iso) || !positive(capture.shutterSeconds) || !positive(capture.width) || !positive(capture.height)) {
    throw new Error('The native camera returned an invalid photo.');
  }
  return capture as ManualCapture;
}
