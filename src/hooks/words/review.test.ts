import { describe, it, expect } from 'vitest';
import type { Word } from './types';
import { BOX_INTERVALS } from './types';

// Pure utility functions extracted for testing
const getWordsForReview = (words: Word[]): Word[] => {
  const now = new Date();
  return words.filter(word => new Date(word.next_review_time) <= now);
};

const getBoxCounts = (words: Word[]) => {
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  words.forEach(word => {
    counts[word.box_number as 1 | 2 | 3 | 4 | 5]++;
  });
  return counts;
};

const makeWord = (overrides: Partial<Word> = {}): Word => ({
  id: crypto.randomUUID(),
  original_word: 'test',
  translated_word: 'тест',
  source_language: 'en',
  target_language: 'ru',
  example_sentences: [],
  mnemonic_hint: null,
  box_number: 1,
  next_review_time: new Date().toISOString(),
  times_reviewed: 0,
  times_correct: 0,
  times_incorrect: 0,
  created_at: new Date().toISOString(),
  last_reviewed: null,
  ...overrides,
});

describe('getWordsForReview', () => {
  it('returns words with past review time', () => {
    const pastWord = makeWord({ next_review_time: new Date(Date.now() - 1000).toISOString() });
    const futureWord = makeWord({ next_review_time: new Date(Date.now() + 60000).toISOString() });
    const result = getWordsForReview([pastWord, futureWord]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(pastWord.id);
  });

  it('returns empty for no due words', () => {
    const futureWord = makeWord({ next_review_time: new Date(Date.now() + 60000).toISOString() });
    expect(getWordsForReview([futureWord])).toHaveLength(0);
  });

  it('returns all for all due', () => {
    const words = [1, 2, 3].map(() => makeWord({ next_review_time: new Date(Date.now() - 1000).toISOString() }));
    expect(getWordsForReview(words)).toHaveLength(3);
  });
});

describe('getBoxCounts', () => {
  it('counts words per box', () => {
    const words = [
      makeWord({ box_number: 1 }),
      makeWord({ box_number: 1 }),
      makeWord({ box_number: 3 }),
      makeWord({ box_number: 5 }),
    ];
    const counts = getBoxCounts(words);
    expect(counts).toEqual({ 1: 2, 2: 0, 3: 1, 4: 0, 5: 1 });
  });

  it('returns all zeros for empty array', () => {
    expect(getBoxCounts([])).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  });
});

describe('BOX_INTERVALS', () => {
  it('has correct intervals', () => {
    expect(BOX_INTERVALS[1]).toBe(1 * 60 * 60 * 1000); // 1 hour
    expect(BOX_INTERVALS[2]).toBe(5 * 60 * 60 * 1000); // 5 hours
    expect(BOX_INTERVALS[3]).toBe(24 * 60 * 60 * 1000); // 1 day
    expect(BOX_INTERVALS[4]).toBe(5 * 24 * 60 * 60 * 1000); // 5 days
    expect(BOX_INTERVALS[5]).toBe(30 * 24 * 60 * 60 * 1000); // 30 days
  });

  it('intervals increase monotonically', () => {
    const keys = [1, 2, 3, 4, 5] as const;
    for (let i = 1; i < keys.length; i++) {
      expect(BOX_INTERVALS[keys[i]]).toBeGreaterThan(BOX_INTERVALS[keys[i - 1]]);
    }
  });
});
