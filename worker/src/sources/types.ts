export interface WordSource {
  getWord(date: string): Promise<{ word: string; puzzle: number }>;
}
