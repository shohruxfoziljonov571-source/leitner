import { supabase } from '@/integrations/supabase/client';
import { BOX_INTERVALS } from './types';
import { getLocalToday } from './helpers';
import type { Word } from './types';

/**
 * Core review logic shared between useWordReview and useLearnSession.
 * Returns the updated word fields and fires server RPCs.
 */
export async function reviewWordCore(
  word: Word,
  isCorrect: boolean,
  userId: string,
  languageId: string,
): Promise<{
  updatedFields: Partial<Word>;
  justLearned: boolean;
  today: string;
}> {
  const previousBoxNumber = word.box_number;
  const newBoxNumber = isCorrect ? Math.min(5, word.box_number + 1) : 1;
  const justLearned = isCorrect && newBoxNumber === 5 && previousBoxNumber < 5;
  const interval = BOX_INTERVALS[newBoxNumber as 1 | 2 | 3 | 4 | 5];
  const today = getLocalToday();

  const updatedFields: Partial<Word> = {
    box_number: newBoxNumber,
    next_review_time: new Date(Date.now() + interval).toISOString(),
    times_reviewed: word.times_reviewed + 1,
    times_correct: isCorrect ? word.times_correct + 1 : word.times_correct,
    times_incorrect: !isCorrect ? word.times_incorrect + 1 : word.times_incorrect,
    last_reviewed: new Date().toISOString(),
  };

  // Update word in DB
  const { error } = await supabase
    .from('words')
    .update(updatedFields)
    .eq('id', word.id);

  if (error) throw error;

  // Fire server-side stats RPCs (non-blocking)
  await Promise.all([
    supabase.rpc('increment_review_stats', {
      p_user_id: userId,
      p_language_id: languageId,
      p_reviewed: 1,
      p_correct: isCorrect ? 1 : 0,
      p_learned: justLearned ? 1 : 0,
      p_date: today,
    }),
    supabase.rpc('increment_daily_words', {
      p_user_id: userId,
      p_language_id: languageId,
      p_date: today,
      p_reviewed: 1,
      p_correct: isCorrect ? 1 : 0,
    }),
  ]);

  return { updatedFields, justLearned, today };
}
