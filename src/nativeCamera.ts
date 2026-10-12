import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import { parseManualCapture, type ManualCapture } from './manualCapture';

type CameraModule = { openCamera(): Promise<unknown>; discardCapture(uris: string[]): Promise<void> };
const camera = Platform.OS === 'ios' ? requireOptionalNativeModule<CameraModule>('ZineCamera') : null;

export const isManualCameraAvailable = Boolean(camera);

export async function openManualCamera(): Promise<ManualCapture | null> {
  if (!camera) throw new Error('Manual camera controls need the custom Little Zine iPhone build. They are not available in Expo Go or on Android. You can still use the system camera or import photos.');
  return parseManualCapture(await camera.openCamera());
}
export async function discardManualCapture(capture: ManualCapture) {
  await camera?.discardCapture([capture.photoUri]).catch(() => {});
}
