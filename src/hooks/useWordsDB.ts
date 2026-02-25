import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLearningLanguage } from '@/contexts/LearningLanguageContext';
import { useWordsFetch } from './words/useWordsFetch';
import { useUserStats } from './words/useUserStats';
import { useWordsCRUD } from './words/useWordsCRUD';
import { useWordReview } from './words/useWordReview';
import { getDefaultStats } from './words/helpers';

export type { Word, UserStats } from './words/types';

export const useWordsDB = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { activeLanguage } = useLearningLanguage();

  const userId = user?.id;
  const languageId = activeLanguage?.id;

  const { words, setWords, fetchWords } = useWordsFetch(userId, languageId);
  const { stats, setStats, fetchStats } = useUserStats(userId, languageId);

  const { addWord, addWordsBulk, updateWord, deleteWord } = useWordsCRUD({
    userId, languageId, words, setWords, setStats,
  });

  const { reviewWord, getWordsForReview, getWordsByBox, getBoxCounts } = useWordReview({
    userId, languageId, words, setWords, setStats,
  });

  useEffect(() => {
    if (userId && languageId) {
      setIsLoading(true);
      Promise.all([fetchWords(), fetchStats()]).finally(() => {
        setIsLoading(false);
      });
    } else {
      setWords([]);
      setStats(getDefaultStats());
      setIsLoading(false);
    }
  }, [userId, languageId]);

  return {
    words,
    stats,
    isLoading,
    addWord,
    addWordsBulk,
    updateWord,
    deleteWord,
    reviewWord,
    getWordsForReview,
    getWordsByBox,
    getBoxCounts,
    refetch: fetchWords,
  };
};
