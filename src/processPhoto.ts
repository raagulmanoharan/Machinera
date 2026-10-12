import { Image } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { fromByteArray, toByteArray } from 'base64-js';
import { decodeJpeg, encodeJpeg } from './jpeg';
import { applyPhotoLook, type PhotoLook } from './treatment';

/** Create a bounded SDR rendition. Never write to the source URI. */
export async function makeFlatPhoto(uri: string, look: PhotoLook = 'flat', strength = 1): Promise<string> {
  if (!FileSystem.cacheDirectory) throw new Error('Photo cache is unavailable.');
  const size = await new Promise<{ width: number; height: number }>((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });
  const longest = Math.max(size.width, size.height);
  const actions = longest > 1600
    ? [{ resize: size.width >= size.height ? { width: 1600 } : { height: 1600 } }]
    : [];
  // Normalize orientation and HEIC/PNG inputs with the device's image decoder.
  const normalized = await manipulateAsync(uri, actions, { compress: 1, format: SaveFormat.JPEG, base64: true });
  const target = `${FileSystem.cacheDirectory}flat-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
  try {
    if (!normalized.base64) throw new Error('Could not decode the photo.');
    // Let React display the progress state before CPU-bound JPEG work begins.
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    const decoded = decodeJpeg(toByteArray(normalized.base64));
    const bytes = encodeJpeg({ ...decoded, data: applyPhotoLook(decoded.data, look, strength) });
    await FileSystem.writeAsStringAsync(target, fromByteArray(bytes), { encoding: FileSystem.EncodingType.Base64 });
    return target;
  } catch (error) {
    await FileSystem.deleteAsync(target, { idempotent: true }).catch(() => {});
    throw error;
  } finally {
    // Only the manipulator's owned temporary file is removed, never the source.
    if (normalized.uri !== uri) await FileSystem.deleteAsync(normalized.uri, { idempotent: true }).catch(() => {});
  }
}
export async function discardFlatPreview(uri: string) {
  if (FileSystem.cacheDirectory && uri.startsWith(`${FileSystem.cacheDirectory}flat-`)) {
    await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
  }
}
