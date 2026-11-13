export type Mark = 'hit' | 'near' | 'miss';

/** Prototype score (lines 331-336): hits first, then near by remaining letter counts. */
export function score(guess: string, answer: string): Mark[] {
  const r: Mark[] = Array<Mark>(5).fill('miss');
  const left: Record<string, number> = {};
  for (let i = 0; i < 5; i++) {
    if (guess[i] === answer[i]) r[i] = 'hit';
    else left[answer[i]] = (left[answer[i]] || 0) + 1;
  }
  for (let i = 0; i < 5; i++) {
    if (r[i] !== 'hit' && left[guess[i]]) {
      r[i] = 'near';
      left[guess[i]]--;
    }
  }
  return r;
}

const ORDER: Record<Mark, number> = { miss: 1, near: 2, hit: 3 };

/** Best mark per letter across guesses (prototype paintKeys). */
export function keyMarks(guesses: string[], answer: string): Record<string, Mark> {
  const best: Record<string, Mark> = {};
  for (const g of guesses) {
    score(g, answer).forEach((s, i) => {
      if (!best[g[i]] || ORDER[s] > ORDER[best[g[i]]]) best[g[i]] = s;
    });
  }
  return best;
}
