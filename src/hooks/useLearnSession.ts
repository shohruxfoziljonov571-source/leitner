import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLearningLanguage } from '@/contexts/LearningLanguageContext';
import { useUserStats } from './words/useUserStats';
import { getLocalToday } from './words/helpers';
import { reviewWordCore } from './words/reviewWordCore';
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
      ]);

      // Also fetch stats in parallel (fire and forget errors)
      fetchStats().catch(e => console.error('Stats fetch error:', e));

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

    try {
      const { updatedFields, justLearned, today } = await reviewWordCore(word, isCorrect, userId, languageId);

      // Update local state
      setReviewWords(prev => prev.map(w => w.id !== wordId ? w : { ...w, ...updatedFields }));

      setStats(prev => ({
        ...prev,
        today_reviewed: prev.today_reviewed + 1,
        today_correct: isCorrect ? prev.today_correct + 1 : prev.today_correct,
        learned_words: justLearned ? prev.learned_words + 1 : prev.learned_words,
        last_active_date: today,
      }));
    } catch (error) {
      console.error('Error reviewing word:', error);
    }
  }, [userId, languageId, reviewWords, setStats]);

  return {
    reviewWords,
    quizPool,
    allWords: [...new Map([...reviewWords, ...quizPool].map(w => [w.id, w])).values()],
    stats,
    isLoading,
    reviewWord,
    refetch: fetchReviewWords,
  };
};
