import { type GameRecord } from '../game/record';
import { backupFileName, makeBackup } from './backupFormat';

const pad = (n: number) => String(n).padStart(2, '0');

/** Download the backup through a temporary link. */
export async function exportBackup(games: Record<string, GameRecord>): Promise<'shared' | 'cancelled' | 'failed'> {
  try {
    const now = new Date();
    const day = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const blob = new Blob([JSON.stringify(makeBackup(games, now.getTime()), null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = backupFileName(day);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return 'shared';
  } catch {
    return 'failed';
  }
}

/** Open a hidden file input; null when cancelled or unreadable. */
export function pickBackupText(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.style.display = 'none';
    const done = (v: string | null) => {
      input.remove();
      resolve(v);
    };
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return done(null);
      file.text().then(done, () => done(null));
    });
    input.addEventListener('cancel', () => done(null));
    document.body.appendChild(input);
    input.click();
  });
}
