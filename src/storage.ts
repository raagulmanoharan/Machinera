import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { parseEntries, type Entry } from './model';

const KEY = '@little-zine/pages/v1';
export async function loadEntries() {
  return parseEntries(await AsyncStorage.getItem(KEY));
}
export async function saveEntries(entries: Entry[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(entries));
}
export async function keepMedia(uri: string, kind: Entry['kind'], id: string) {
  if (!FileSystem.documentDirectory) throw new Error('Device storage is unavailable.');
  const directory = `${FileSystem.documentDirectory}zine-media/`;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  const extension = uri.split('?')[0].match(/\.([a-zA-Z0-9]{1,5})$/)?.[1] || (kind === 'video' ? 'mp4' : 'jpg');
  const target = `${directory}${id}.${extension}`;
  try {
    await FileSystem.copyAsync({ from: uri, to: target });
    return target;
  } catch (error) {
    await removeMedia(target);
    throw error;
  }
}
export async function removeMedia(uri: string) {
  // Only delete files owned by this app, never original library assets.
  const directory = `${FileSystem.documentDirectory}zine-media/`;
  if (FileSystem.documentDirectory && uri.startsWith(directory)) {
    await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
  }
}
