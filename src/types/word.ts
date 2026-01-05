export interface Word {
  id: string;
  originalWord: string;
  translatedWord: string;
  sourceLanguage: 'ru' | 'en';
  targetLanguage: 'uz' | 'ru' | 'en';
  exampleSentences: string[];
  boxNumber: 1 | 2 | 3 | 4 | 5;
  nextReviewTime: Date;
  timesReviewed: number;
  timesCorrect: number;
  timesIncorrect: number;
  createdAt: Date;
  lastReviewed: Date | null;
}

export interface UserStats {
  totalWords: number;
  learnedWords: number;
  streak: number;
  todayReviewed: number;
  todayCorrect: number;
  lastActiveDate: string;
}

export const BOX_INTERVALS = {
  1: 1 * 60 * 60 * 1000,        // 1 hour
  2: 5 * 60 * 60 * 1000,        // 5 hours
  3: 24 * 60 * 60 * 1000,       // 1 day
  4: 5 * 24 * 60 * 60 * 1000,   // 5 days
  5: 30 * 24 * 60 * 60 * 1000,  // 30 days
} as const;
