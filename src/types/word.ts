/**
 * Word type matching database schema (snake_case).
 * Used by learning components (FlashCard, QuizCard, WritingCard).
 */
export interface Word {
  id: string;
  original_word: string;
  translated_word: string;
  source_language: string;
  target_language: string;
  example_sentences: string[];
  mnemonic_hint?: string | null;
  box_number: number;
  next_review_time: string;
  times_reviewed: number;
  times_correct: number;
  times_incorrect: number;
  created_at: string;
  last_reviewed: string | null;
}

export interface UserStats {
  total_words: number;
  learned_words: number;
  streak: number;
  today_reviewed: number;
  today_correct: number;
  last_active_date: string;
  daily_goal: number;
}

export const BOX_INTERVALS = {
  1: 1 * 60 * 60 * 1000,        // 1 hour
  2: 5 * 60 * 60 * 1000,        // 5 hours
  3: 24 * 60 * 60 * 1000,       // 1 day
  4: 5 * 24 * 60 * 60 * 1000,   // 5 days
  5: 30 * 24 * 60 * 60 * 1000,  // 30 days
} as const;
