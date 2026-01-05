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
}

const getDefaultStats = (): UserStats => ({
  total_words: 0,
  learned_words: 0,
  streak: 0,
  today_reviewed: 0,
  today_correct: 0,
  last_active_date: new Date().toISOString().split('T')[0],
});

export const useWordsDB = () => {
  const [words, setWords] = useState<Word[]>([]);
  const [stats, setStats] = useState<UserStats>(getDefaultStats());
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { activeLanguage } = useLearningLanguage();

  const fetchWords = useCallback(async () => {
    if (!user || !activeLanguage) {
      setWords([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('words')
        .select('*')
        .eq('user_id', user.id)
        .eq('user_language_id', activeLanguage.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWords(data || []);
    } catch (error) {
      console.error('Error fetching words:', error);
    } finally {
      setIsLoading(false);
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
        const today = new Date().toISOString().split('T')[0];
        
        // Reset daily stats if new day
        if (data.last_active_date !== today) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];
          
          let newStreak = data.streak;
          if (data.last_active_date === yesterdayStr && data.today_reviewed > 0) {
            newStreak += 1;
          } else if (data.last_active_date !== today) {
            newStreak = 0;
          }

          // Update in database
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
      fetchWords();
      fetchStats();
    } else {
      setWords([]);
      setStats(getDefaultStats());
      setIsLoading(false);
    }
  }, [user, activeLanguage, fetchWords, fetchStats]);

  const addWord = useCallback(async (word: {
    original_word: string;
    translated_word: string;
    source_language: string;
    target_language: string;
    example_sentences?: string[];
    category_id?: string | null;
  }) => {
    if (!user || !activeLanguage) return null;

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

      // Update stats
      await supabase
        .from('user_stats')
        .update({ total_words: stats.total_words + 1 })
        .eq('user_id', user.id)
        .eq('user_language_id', activeLanguage.id);

      setStats(prev => ({ ...prev, total_words: prev.total_words + 1 }));

      return data;
    } catch (error) {
      console.error('Error adding word:', error);
      return null;
    }
  }, [user, activeLanguage, stats.total_words]);

  // Bulk insert for faster Excel imports
  const addWordsBulk = useCallback(async (wordsToAdd: {
    original_word: string;
    translated_word: string;
    source_language: string;
    target_language: string;
    example_sentences?: string[];
    category_id?: string | null;
  }[]) => {
    if (!user || !activeLanguage || wordsToAdd.length === 0) return [];

    try {
      const wordsData = wordsToAdd.map(word => ({
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

      setWords(prev => [...(data || []), ...prev]);

      // Update stats with total count
      const newTotal = stats.total_words + wordsToAdd.length;
      await supabase
        .from('user_stats')
        .update({ total_words: newTotal })
        .eq('user_id', user.id)
        .eq('user_language_id', activeLanguage.id);

      setStats(prev => ({ ...prev, total_words: newTotal }));

      return data || [];
    } catch (error) {
      console.error('Error bulk adding words:', error);
      return [];
    }
  }, [user, activeLanguage, stats.total_words]);

  const deleteWord = useCallback(async (wordId: string) => {
    if (!user || !activeLanguage) return;

    try {
      const { error } = await supabase
        .from('words')
        .delete()
        .eq('id', wordId);

      if (error) throw error;

      setWords(prev => prev.filter(w => w.id !== wordId));

      // Update stats
      await supabase
        .from('user_stats')
        .update({ total_words: Math.max(0, stats.total_words - 1) })
        .eq('user_id', user.id)
        .eq('user_language_id', activeLanguage.id);

      setStats(prev => ({ ...prev, total_words: Math.max(0, prev.total_words - 1) }));
    } catch (error) {
      console.error('Error deleting word:', error);
    }
  }, [user, activeLanguage, stats.total_words]);

  const reviewWord = useCallback(async (wordId: string, isCorrect: boolean) => {
    if (!user || !activeLanguage) return;

    const word = words.find(w => w.id === wordId);
    if (!word) return;

    const newBoxNumber = isCorrect 
      ? Math.min(5, word.box_number + 1)
      : 1;

    const interval = BOX_INTERVALS[newBoxNumber as 1 | 2 | 3 | 4 | 5];

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

      // Update stats
      const today = new Date().toISOString().split('T')[0];
      await supabase
        .from('user_stats')
        .update({
          today_reviewed: stats.today_reviewed + 1,
          today_correct: isCorrect ? stats.today_correct + 1 : stats.today_correct,
          learned_words: isCorrect ? stats.learned_words + 1 : stats.learned_words,
          last_active_date: today,
        })
        .eq('user_id', user.id)
        .eq('user_language_id', activeLanguage.id);

      setStats(prev => ({
        ...prev,
        today_reviewed: prev.today_reviewed + 1,
        today_correct: isCorrect ? prev.today_correct + 1 : prev.today_correct,
        learned_words: isCorrect ? prev.learned_words + 1 : prev.learned_words,
        last_active_date: today,
      }));
    } catch (error) {
      console.error('Error reviewing word:', error);
    }
  }, [user, activeLanguage, words, stats]);

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
    deleteWord,
    reviewWord,
    getWordsForReview,
    getWordsByBox,
    getBoxCounts,
    refetch: fetchWords,
  };
};
