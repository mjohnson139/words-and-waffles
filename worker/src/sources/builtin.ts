import { dailyWord, puzzleNumber } from '../../../app/src/game/daily';
import type { WordSource } from './types';

// Do not ship an adapter that scrapes another publisher's puzzle (see the brief).
// The builtin source is the same deterministic list the app bundles.
export const builtinSource: WordSource = {
  getWord: (date) => Promise.resolve({ word: dailyWord(date), puzzle: puzzleNumber(date) }),
};
