import { File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';

import { type GameRecord } from '../game/record';
import { backupFileName, makeBackup } from './backupFormat';

const pad = (n: number) => String(n).padStart(2, '0');

/** Write the backup to the cache and open the share sheet. */
export async function exportBackup(games: Record<string, GameRecord>): Promise<'shared' | 'cancelled' | 'failed'> {
  try {
    if (!(await Sharing.isAvailableAsync())) return 'failed';
    const now = new Date();
    const day = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const file = new File(Paths.cache, backupFileName(day));
    file.create({ overwrite: true });
    await file.write(JSON.stringify(makeBackup(games, now.getTime()), null, 2));
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      UTI: 'public.json',
      dialogTitle: 'Back up your games',
    });
    return 'shared';
  } catch {
    return 'failed';
  }
}

/** Let the player pick a backup file; null when cancelled or unreadable. */
export async function pickBackupText(): Promise<string | null> {
  try {
    // Some pickers label .json files as text or octet-stream, so also allow any type.
    const res = await DocumentPicker.getDocumentAsync({
      type: ['application/json', '*/*'],
      copyToCacheDirectory: true,
    });
    if (res.canceled) return null;
    const asset = res.assets[0];
    return await new File(asset.uri).text();
  } catch {
    return null;
  }
}
