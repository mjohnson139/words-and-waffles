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
