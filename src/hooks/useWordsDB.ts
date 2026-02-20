import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLearningLanguage } from '@/contexts/LearningLanguageContext';
import { BOX_INTERVALS } from '@/types/word';

interface Word {
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

interface UserStats {
  total_words: number;
  learned_words: number;
  streak: number;
  today_reviewed: number;
  today_correct: number;
  last_active_date: string;
  daily_goal: number;
}

const getDefaultStats = (): UserStats => ({
  total_words: 0,
  learned_words: 0,
  streak: 0,
  today_reviewed: 0,
  today_correct: 0,
  last_active_date: new Date().toISOString().split('T')[0],
  daily_goal: 20,
});

const getLocalToday = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export const useWordsDB = () => {
  const [words, setWords] = useState<Word[]>([]);
  const [stats, setStats] = useState<UserStats>(getDefaultStats());
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { activeLanguage } = useLearningLanguage();

  const fetchWords = useCallback(async () => {
    if (!user || !activeLanguage) {
      setWords([]);
      return;
    }

    try {
      // First get total count, then fetch all pages in parallel
      const { count, error: countError } = await supabase
        .from('words')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('user_language_id', activeLanguage.id);

      if (countError) throw countError;

      const total = count || 0;
      const pageSize = 1000;

      if (total === 0) {
        setWords([]);
        return;
      }

      // Build parallel page requests
      const pageCount = Math.ceil(total / pageSize);
      const pagePromises = Array.from({ length: pageCount }, (_, i) =>
        supabase
          .from('words')
          .select('*')
          .eq('user_id', user.id)
          .eq('user_language_id', activeLanguage.id)
          .order('created_at', { ascending: false })
          .range(i * pageSize, (i + 1) * pageSize - 1)
      );

      const results = await Promise.all(pagePromises);
      const allWords: Word[] = [];
      for (const { data, error } of results) {
        if (error) throw error;
        if (data) allWords.push(...data);
      }

      setWords(allWords);
    } catch (error) {
      console.error('Error fetching words:', error);
    }
  }, [user, activeLanguage]);

  const fetchStats = useCallback(async () => {
    if (!user || !activeLanguage) {
      setStats(getDefaultStats());
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .eq('user_language_id', activeLanguage.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const today = getLocalToday();

        // Reset daily stats if new day
        if (data.last_active_date !== today) {
          const now = new Date();
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

          let newStreak = data.streak;
          if (data.last_active_date === yesterdayStr && data.today_reviewed > 0) {
            newStreak += 1;
          } else if (data.last_active_date !== today) {
            newStreak = 0;
          }

          await supabase
            .from('user_stats')
            .update({
              today_reviewed: 0,
              today_correct: 0,
              streak: newStreak,
              last_active_date: today,
            })
            .eq('id', data.id);

          setStats({
            ...data,
            today_reviewed: 0,
            today_correct: 0,
            streak: newStreak,
            last_active_date: today,
          });
        } else {
          setStats(data);
        }
      } else {
        // Create stats record
        await supabase
          .from('user_stats')
          .insert({
            user_id: user.id,
            user_language_id: activeLanguage.id,
          });
        setStats(getDefaultStats());
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [user, activeLanguage]);

  useEffect(() => {
    if (user && activeLanguage) {
      setIsLoading(true);
      Promise.all([fetchWords(), fetchStats()]).finally(() => {
        setIsLoading(false);
      });
    } else {
      setWords([]);
      setStats(getDefaultStats());
      setIsLoading(false);
    }
  }, [user, activeLanguage]);

  // Visibility-change listener: refresh streak when user returns to tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user && activeLanguage) {
        fetchStats();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, activeLanguage, fetchStats]);

  const checkDuplicate = useCallback((originalWord: string) => {
    return words.some(w =>
      w.original_word.toLowerCase().trim() === originalWord.toLowerCase().trim()
    );
  }, [words]);

  const addWord = useCallback(async (word: {
    original_word: string;
    translated_word: string;
    source_language: string;
    target_language: string;
    example_sentences?: string[];
    category_id?: string | null;
  }) => {
    if (!user || !activeLanguage) return null;

    if (checkDuplicate(word.original_word)) {
      return { error: 'duplicate', existingWord: word.original_word };
    }

    try {
      const { data, error } = await supabase
        .from('words')
        .insert({
          user_id: user.id,
          user_language_id: activeLanguage.id,
          original_word: word.original_word,
          translated_word: word.translated_word,
          source_language: word.source_language,
          target_language: word.target_language,
          example_sentences: word.example_sentences || [],
          box_number: 1,
          next_review_time: new Date().toISOString(),
          category_id: word.category_id || null,
        })
        .select()
        .single();

      if (error) throw error;

      setWords(prev => [data, ...prev]);

      // Atomic DB-side increment — no race condition
      await (supabase as any).rpc('increment_total_words', {
        p_user_id: user.id,
        p_language_id: activeLanguage.id,
        p_delta: 1,
      });

      setStats(prev => ({ ...prev, total_words: prev.total_words + 1 }));

      return data;
    } catch (error: any) {
      console.error('Error adding word:', error);
      throw new Error(error?.message || 'So\'z qo\'shishda xatolik yuz berdi');
    }
  }, [user, activeLanguage, checkDuplicate]);

  const addWordsBulk = useCallback(async (wordsToAdd: {
    original_word: string;
    translated_word: string;
    source_language: string;
    target_language: string;
    example_sentences?: string[];
    category_id?: string | null;
  }[]) => {
    if (!user || !activeLanguage || wordsToAdd.length === 0) return { added: [], duplicates: [] };

    const existingWords = new Set(words.map(w => w.original_word.toLowerCase().trim()));
    const uniqueWords: typeof wordsToAdd = [];
    const duplicates: string[] = [];

    wordsToAdd.forEach(word => {
      const normalizedWord = word.original_word.toLowerCase().trim();
      if (!normalizedWord) return;
      if (existingWords.has(normalizedWord)) {
        duplicates.push(word.original_word);
      } else {
        uniqueWords.push(word);
        existingWords.add(normalizedWord);
      }
    });

    if (uniqueWords.length === 0) {
      return { added: [], duplicates };
    }

    try {
      const CHUNK_SIZE = 500;
      const allInserted: Word[] = [];

      for (let i = 0; i < uniqueWords.length; i += CHUNK_SIZE) {
        const chunk = uniqueWords.slice(i, i + CHUNK_SIZE);
        const wordsData = chunk.map(word => ({
          user_id: user.id,
          user_language_id: activeLanguage.id,
          original_word: word.original_word,
          translated_word: word.translated_word,
          source_language: word.source_language,
          target_language: word.target_language,
          example_sentences: word.example_sentences || [],
          box_number: 1,
          next_review_time: new Date().toISOString(),
          category_id: word.category_id || null,
        }));

        const { data, error } = await supabase
          .from('words')
          .insert(wordsData)
          .select();

        if (error) throw error;
        if (data) allInserted.push(...data);
      }

      setWords(prev => [...allInserted, ...prev]);
      setStats(prev => ({ ...prev, total_words: prev.total_words + allInserted.length }));

      // Atomic DB-side bulk increment — no race condition
      await (supabase as any).rpc('increment_total_words', {
        p_user_id: user.id,
        p_language_id: activeLanguage.id,
        p_delta: allInserted.length,
      });

      return { added: allInserted, duplicates };
    } catch (error: any) {
      console.error('Error bulk adding words:', error);
      throw new Error(error?.message || 'So\'zlarni qo\'shishda xatolik yuz berdi');
    }
  }, [user, activeLanguage, words]);

  const updateWord = useCallback(async (wordId: string, updates: {
    original_word?: string;
    translated_word?: string;
    example_sentences?: string[];
    category_id?: string | null;
  }) => {
    if (!user || !activeLanguage) return null;

    try {
      const { data, error } = await supabase
        .from('words')
        .update(updates)
        .eq('id', wordId)
        .select()
        .single();

      if (error) throw error;

      setWords(prev => prev.map(w => w.id === wordId ? { ...w, ...data } : w));
      return data;
    } catch (error) {
      console.error('Error updating word:', error);
      return null;
    }
  }, [user, activeLanguage]);

  const deleteWord = useCallback(async (wordId: string) => {
    if (!user || !activeLanguage) return;

    try {
      const { error } = await supabase
        .from('words')
        .delete()
        .eq('id', wordId);

      if (error) throw error;

      setWords(prev => prev.filter(w => w.id !== wordId));

      // Atomic DB-side decrement — no race condition
      await (supabase as any).rpc('increment_total_words', {
        p_user_id: user.id,
        p_language_id: activeLanguage.id,
        p_delta: -1,
      });

      setStats(prev => ({ ...prev, total_words: Math.max(0, prev.total_words - 1) }));
    } catch (error) {
      console.error('Error deleting word:', error);
    }
  }, [user, activeLanguage]);

  const reviewWord = useCallback(async (wordId: string, isCorrect: boolean) => {
    if (!user || !activeLanguage) return;

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

      // Optimistic local update
      setStats(prev => ({
        ...prev,
        today_reviewed: prev.today_reviewed + 1,
        today_correct: isCorrect ? prev.today_correct + 1 : prev.today_correct,
        learned_words: justLearned ? prev.learned_words + 1 : prev.learned_words,
        last_active_date: today,
      }));

      // Atomic DB increments — no race conditions, no override
      await Promise.all([
        // user_stats: atomic increment via RPC
        (supabase as any).rpc('increment_review_stats', {
          p_user_id: user.id,
          p_language_id: activeLanguage.id,
          p_reviewed: 1,
          p_correct: isCorrect ? 1 : 0,
          p_learned: justLearned ? 1 : 0,
          p_date: today,
        }),
        // daily_stats: atomic increment via RPC (no override)
        (supabase as any).rpc('increment_daily_words', {
          p_user_id: user.id,
          p_language_id: activeLanguage.id,
          p_date: today,
          p_reviewed: 1,
          p_correct: isCorrect ? 1 : 0,
        }),
      ]);
    } catch (error) {
      console.error('Error reviewing word:', error);
    }
  }, [user, activeLanguage, words]);

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
