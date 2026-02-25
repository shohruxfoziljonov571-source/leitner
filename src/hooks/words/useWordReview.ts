import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Word, UserStats } from './types';
import { BOX_INTERVALS } from './types';
import { getLocalToday } from './helpers';

interface ReviewDeps {
  userId: string | undefined;
  languageId: string | undefined;
  words: Word[];
  setWords: React.Dispatch<React.SetStateAction<Word[]>>;
  setStats: React.Dispatch<React.SetStateAction<UserStats>>;
}

export const useWordReview = ({ userId, languageId, words, setWords, setStats }: ReviewDeps) => {
  const reviewWord = useCallback(async (wordId: string, isCorrect: boolean) => {
    if (!userId || !languageId) return;

    const word = words.find(w => w.id === wordId);
    if (!word) return;

    const previousBoxNumber = word.box_number;
    const newBoxNumber = isCorrect
      ? Math.min(5, word.box_number + 1)
      : 1;

    const justLearned = isCorrect && newBoxNumber === 5 && previousBoxNumber < 5;
    const interval = BOX_INTERVALS[newBoxNumber as 1 | 2 | 3 | 4 | 5];
    const today = getLocalToday();

    try {
      const { error } = await supabase
        .from('words')
        .update({
          box_number: newBoxNumber,
          next_review_time: new Date(Date.now() + interval).toISOString(),
          times_reviewed: word.times_reviewed + 1,
          times_correct: isCorrect ? word.times_correct + 1 : word.times_correct,
          times_incorrect: !isCorrect ? word.times_incorrect + 1 : word.times_incorrect,
          last_reviewed: new Date().toISOString(),
        })
        .eq('id', wordId);

      if (error) throw error;

      setWords(prev => prev.map(w => {
        if (w.id !== wordId) return w;
        return {
          ...w,
          box_number: newBoxNumber,
          next_review_time: new Date(Date.now() + interval).toISOString(),
          times_reviewed: w.times_reviewed + 1,
          times_correct: isCorrect ? w.times_correct + 1 : w.times_correct,
          times_incorrect: !isCorrect ? w.times_incorrect + 1 : w.times_incorrect,
          last_reviewed: new Date().toISOString(),
        };
      }));

      setStats(prev => ({
        ...prev,
        today_reviewed: prev.today_reviewed + 1,
        today_correct: isCorrect ? prev.today_correct + 1 : prev.today_correct,
        learned_words: justLearned ? prev.learned_words + 1 : prev.learned_words,
        last_active_date: today,
      }));

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
    } catch (error) {
      console.error('Error reviewing word:', error);
    }
  }, [userId, languageId, words, setWords, setStats]);

  const getWordsForReview = useCallback(() => {
    const now = new Date();
    return words.filter(word => new Date(word.next_review_time) <= now);
  }, [words]);

  const getWordsByBox = useCallback((boxNumber: number) => {
    return words.filter(word => word.box_number === boxNumber);
  }, [words]);

  const getBoxCounts = useCallback(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    words.forEach(word => {
      counts[word.box_number as 1 | 2 | 3 | 4 | 5]++;
    });
    return counts;
  }, [words]);

  return { reviewWord, getWordsForReview, getWordsByBox, getBoxCounts };
};
