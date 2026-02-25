import { BOX_INTERVALS } from '@/types/word';

export { BOX_INTERVALS };

export interface Word {
  id: string;
  original_word: string;
  translated_word: string;
  source_language: string;
  target_language: string;
  example_sentences: string[];
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
