import { ANSWERS } from './answers';
import { dnum } from './dates';

export const EPOCH = '2026-11-01';

/** Index into ANSWERS for a date; wraps and is safe before the epoch (prototype line 258). */
export const dailyIndex = (date: string): number =>
  (((dnum(date) - dnum(EPOCH)) % ANSWERS.length) + ANSWERS.length) % ANSWERS.length;

export const dailyWord = (date: string): string => ANSWERS[dailyIndex(date)];

/** Puzzle number: days since the epoch + 1. */
export const puzzleNumber = (date: string): number => dnum(date) - dnum(EPOCH) + 1;
