import { useMemo } from 'react';
import { usePremium } from '@/contexts/PremiumContext';

/**
 * Hook to check daily usage against premium limits.
 * Returns remaining counts and whether limits are reached.
 */
export const useDailyLimits = (
  todayWordsAdded: number,
  todayReviewed: number
) => {
  const { isPremium, limits } = usePremium();

  return useMemo(() => {
    const wordsRemaining = isPremium
      ? Infinity
      : Math.max(0, limits.maxWordsPerDay - todayWordsAdded);

    const quizRemaining = isPremium
      ? Infinity
      : Math.max(0, limits.maxQuizPerDay - todayReviewed);

    return {
      wordsRemaining,
      quizRemaining,
      wordLimitReached: wordsRemaining <= 0,
      quizLimitReached: quizRemaining <= 0,
      maxWordsPerDay: limits.maxWordsPerDay,
      maxQuizPerDay: limits.maxQuizPerDay,
      isPremium,
    };
  }, [isPremium, limits, todayWordsAdded, todayReviewed]);
};
