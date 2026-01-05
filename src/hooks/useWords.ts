import { useState, useEffect, useCallback } from 'react';
import { Word, UserStats, BOX_INTERVALS } from '@/types/word';

const WORDS_STORAGE_KEY = 'leitner-words';
const STATS_STORAGE_KEY = 'leitner-stats';

const getDefaultStats = (): UserStats => ({
  totalWords: 0,
  learnedWords: 0,
  streak: 0,
  todayReviewed: 0,
  todayCorrect: 0,
  lastActiveDate: new Date().toDateString(),
});

export const useWords = () => {
  const [words, setWords] = useState<Word[]>([]);
  const [stats, setStats] = useState<UserStats>(getDefaultStats());
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage
  useEffect(() => {
    const savedWords = localStorage.getItem(WORDS_STORAGE_KEY);
    const savedStats = localStorage.getItem(STATS_STORAGE_KEY);
    
    if (savedWords) {
      const parsed = JSON.parse(savedWords);
      setWords(parsed.map((w: any) => ({
        ...w,
        nextReviewTime: new Date(w.nextReviewTime),
        createdAt: new Date(w.createdAt),
        lastReviewed: w.lastReviewed ? new Date(w.lastReviewed) : null,
      })));
    }
    
    if (savedStats) {
      const parsedStats = JSON.parse(savedStats);
      const today = new Date().toDateString();
      
      // Reset daily stats if it's a new day
      if (parsedStats.lastActiveDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        // Check streak
        if (parsedStats.lastActiveDate === yesterday.toDateString() && parsedStats.todayReviewed > 0) {
          parsedStats.streak += 1;
        } else if (parsedStats.lastActiveDate !== today) {
          parsedStats.streak = 0;
        }
        
        parsedStats.todayReviewed = 0;
        parsedStats.todayCorrect = 0;
        parsedStats.lastActiveDate = today;
      }
      
      setStats(parsedStats);
    }
    
    setIsLoading(false);
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(WORDS_STORAGE_KEY, JSON.stringify(words));
      localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
    }
  }, [words, stats, isLoading]);

  const addWord = useCallback((word: Omit<Word, 'id' | 'boxNumber' | 'nextReviewTime' | 'timesReviewed' | 'timesCorrect' | 'timesIncorrect' | 'createdAt' | 'lastReviewed'>) => {
    const newWord: Word = {
      ...word,
      id: crypto.randomUUID(),
      boxNumber: 1,
      nextReviewTime: new Date(),
      timesReviewed: 0,
      timesCorrect: 0,
      timesIncorrect: 0,
      createdAt: new Date(),
      lastReviewed: null,
    };
    
    setWords(prev => [...prev, newWord]);
    setStats(prev => ({
      ...prev,
      totalWords: prev.totalWords + 1,
    }));
    
    return newWord;
  }, []);

  const deleteWord = useCallback((wordId: string) => {
    setWords(prev => prev.filter(w => w.id !== wordId));
    setStats(prev => ({
      ...prev,
      totalWords: Math.max(0, prev.totalWords - 1),
    }));
  }, []);

  const reviewWord = useCallback((wordId: string, isCorrect: boolean) => {
    setWords(prev => prev.map(word => {
      if (word.id !== wordId) return word;
      
      let newBoxNumber: 1 | 2 | 3 | 4 | 5;
      
      if (isCorrect) {
        newBoxNumber = Math.min(5, word.boxNumber + 1) as 1 | 2 | 3 | 4 | 5;
      } else {
        newBoxNumber = 1;
      }
      
      const interval = BOX_INTERVALS[newBoxNumber];
      
      return {
        ...word,
        boxNumber: newBoxNumber,
        nextReviewTime: new Date(Date.now() + interval),
        timesReviewed: word.timesReviewed + 1,
        timesCorrect: isCorrect ? word.timesCorrect + 1 : word.timesCorrect,
        timesIncorrect: !isCorrect ? word.timesIncorrect + 1 : word.timesIncorrect,
        lastReviewed: new Date(),
      };
    }));
    
    setStats(prev => ({
      ...prev,
      todayReviewed: prev.todayReviewed + 1,
      todayCorrect: isCorrect ? prev.todayCorrect + 1 : prev.todayCorrect,
      learnedWords: isCorrect ? prev.learnedWords + 1 : prev.learnedWords,
      lastActiveDate: new Date().toDateString(),
    }));
  }, []);

  const getWordsForReview = useCallback(() => {
    const now = new Date();
    return words.filter(word => new Date(word.nextReviewTime) <= now);
  }, [words]);

  const getWordsByBox = useCallback((boxNumber: number) => {
    return words.filter(word => word.boxNumber === boxNumber);
  }, [words]);

  const getBoxCounts = useCallback(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    words.forEach(word => {
      counts[word.boxNumber]++;
    });
    return counts;
  }, [words]);

  return {
    words,
    stats,
    isLoading,
    addWord,
    deleteWord,
    reviewWord,
    getWordsForReview,
    getWordsByBox,
    getBoxCounts,
  };
};
