export type Entry = {
  id: string;
  uri: string;
  kind: 'photo' | 'video';
  note: string;
  createdAt: string;
  originalUri?: string;
  photoTreatment?: 'flat-v1' | 'editorial-v1';
  lookStrength?: number;
  rawUri?: string;
  capture?: { mode: 'bayer-raw' | 'manual-photo'; iso: number; shutterSeconds: number };
};

export function parseEntries(raw: string | null): Entry[] {
  if (raw === null) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value) || !value.every(isEntry)) {
    throw new Error('The saved journal could not be read. Your media has not been removed.');
  }
  if (new Set(value.map(entry => entry.id)).size !== value.length) {
    throw new Error('The saved journal contains duplicate page IDs.');
  }
  return value;
}

function isEntry(value: unknown): value is Entry {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Record<string, unknown>;
  return typeof entry.id === 'string' && entry.id.length > 0 &&
    typeof entry.uri === 'string' && entry.uri.length > 0 &&
    (entry.kind === 'photo' || entry.kind === 'video') &&
    typeof entry.note === 'string' && typeof entry.createdAt === 'string' &&
    Number.isFinite(Date.parse(entry.createdAt)) &&
    (entry.originalUri === undefined || (typeof entry.originalUri === 'string' && entry.originalUri.length > 0 && entry.kind === 'photo')) &&
    (entry.photoTreatment === undefined || ((entry.photoTreatment === 'flat-v1' || entry.photoTreatment === 'editorial-v1') && entry.kind === 'photo' && typeof entry.originalUri === 'string')) &&
    (entry.lookStrength === undefined || (entry.photoTreatment !== undefined && typeof entry.lookStrength === 'number' && Number.isFinite(entry.lookStrength) && entry.lookStrength >= 0 && entry.lookStrength <= 1)) &&
    validRawFields(entry);
}

export function pageAfterRemoval(index: number, remaining: number): number {
  return Math.max(0, Math.min(index, remaining - 1));
}

function validRawFields(entry: Record<string, unknown>) {
  if (entry.rawUri === undefined && entry.capture === undefined) return true;
  if (entry.kind !== 'photo' || !entry.capture || typeof entry.capture !== 'object') return false;
  const capture = entry.capture as Record<string, unknown>;
  if (capture.mode === 'bayer-raw' && (typeof entry.rawUri !== 'string' || !entry.rawUri.endsWith('.dng'))) return false;
  if (capture.mode === 'manual-photo' && entry.rawUri !== undefined) return false;
  return (capture.mode === 'bayer-raw' || capture.mode === 'manual-photo') && typeof capture.iso === 'number' &&
    Number.isFinite(capture.iso) && capture.iso > 0 && typeof capture.shutterSeconds === 'number' &&
    Number.isFinite(capture.shutterSeconds) && capture.shutterSeconds > 0;
}
