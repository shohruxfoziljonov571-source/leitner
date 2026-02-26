import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLearningLanguage } from '@/contexts/LearningLanguageContext';
import { useUserStats } from './words/useUserStats';
import { getDefaultStats, getLocalToday } from './words/helpers';
import { BOX_INTERVALS } from './words/types';
import type { Word, UserStats } from './words/types';

/**
 * Lightweight hook for the Learn page.
 * Only fetches review-ready words + a small random sample for quiz distractors.
 * Does NOT load the entire word collection.
 */
export const useLearnSession = () => {
  const { user } = useAuth();
  const { activeLanguage } = useLearningLanguage();
  const userId = user?.id;
  const languageId = activeLanguage?.id;

  const { stats, setStats, fetchStats } = useUserStats(userId, languageId);
  const [reviewWords, setReviewWords] = useState<Word[]>([]);
  const [quizPool, setQuizPool] = useState<Word[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReviewWords = useCallback(async () => {
    if (!userId || !languageId) {
      setReviewWords([]);
      setQuizPool([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Fetch review-ready words and quiz distractors in parallel
      const [reviewResult, quizResult] = await Promise.all([
        supabase
          .from('words')
          .select('*')
          .eq('user_id', userId)
          .eq('user_language_id', languageId)
          .lte('next_review_time', new Date().toISOString())
          .order('next_review_time', { ascending: true })
          .limit(200),
        supabase
          .from('words')
          .select('*')
          .eq('user_id', userId)
          .eq('user_language_id', languageId)
          .order('created_at', { ascending: false })
          .limit(100),
        fetchStats(),
      ]);

      if (reviewResult.error) throw reviewResult.error;
      if (quizResult.error) throw quizResult.error;

      setReviewWords((reviewResult.data || []) as Word[]);
      setQuizPool((quizResult.data || []) as Word[]);
    } catch (error) {
      console.error('Error fetching review words:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, languageId, fetchStats]);

  useEffect(() => {
    fetchReviewWords();
  }, [fetchReviewWords]);

  const reviewWord = useCallback(async (wordId: string, isCorrect: boolean) => {
    if (!userId || !languageId) return;

    const word = reviewWords.find(w => w.id === wordId);
    if (!word) return;

    const previousBoxNumber = word.box_number;
    const newBoxNumber = isCorrect ? Math.min(5, word.box_number + 1) : 1;
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

      // Update local state
      setReviewWords(prev => prev.map(w => {
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
  }, [userId, languageId, reviewWords, setStats]);

  return {
    /** Words ready for review (next_review_time <= now) */
    reviewWords,
    /** Random sample of words for quiz distractors */
    quizPool,
    /** Combined list for quiz mode (review + pool, deduplicated) */
    allWords: [...new Map([...reviewWords, ...quizPool].map(w => [w.id, w])).values()],
    stats,
    isLoading,
    reviewWord,
    refetch: fetchReviewWords,
  };
};
