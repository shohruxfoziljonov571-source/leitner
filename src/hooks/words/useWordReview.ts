import { useCallback } from 'react';
import type { Word, UserStats } from './types';
import { getLocalToday } from './helpers';
import { reviewWordCore } from './reviewWordCore';

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

    try {
      const { updatedFields, justLearned, today } = await reviewWordCore(word, isCorrect, userId, languageId);

      setWords(prev => prev.map(w => w.id !== wordId ? w : { ...w, ...updatedFields }));

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
