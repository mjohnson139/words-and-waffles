/** Tile and key sizes for the play screen (port of prototype fit(), lines 442-451). */
export function fit(o: {
  width: number;
  height: number;
  boardTop: number;
  keyboardHeight?: number;
}): { tile: number; key: number } {
  const { width, height, boardTop, keyboardHeight = 190 } = o;
  const key = height < 620 ? 40 : height < 720 ? 45 : 50;
  const h = (height - boardTop - keyboardHeight - 12 - 14 - 12 - 87) / 6;
  const w = (Math.min(width, 500) - 32 - 22 - 28) / 5;
  return { tile: Math.max(30, Math.min(62, Math.floor(Math.min(h, w)))), key };
}

/**
 * Web only (K1): the space to add under the bottom key row, on top of the safe-area inset App
 * already leaves, so a fast tap on Enter or Delete does not land on the browser's own bottom bar
 * (Safari's tab bar, Android's gesture area). The installed app's home-indicator inset
 * (viewport-fit=cover) usually covers it already, so only the shortfall is added.
 */
export const WEB_BOTTOM_CLEARANCE = 20;

export function webKeyboardClearance(insetBottom: number): number {
  return Math.max(0, WEB_BOTTOM_CLEARANCE - insetBottom);
}
