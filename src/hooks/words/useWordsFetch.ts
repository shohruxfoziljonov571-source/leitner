import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Word } from './types';

export const useWordsFetch = (userId: string | undefined, languageId: string | undefined) => {
  const [words, setWords] = useState<Word[]>([]);

  const fetchWords = useCallback(async () => {
    if (!userId || !languageId) {
      setWords([]);
      return;
    }

    try {
      const { count, error: countError } = await supabase
        .from('words')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('user_language_id', languageId);

      if (countError) throw countError;

      const total = count || 0;
      const pageSize = 1000;

      if (total === 0) {
        setWords([]);
        return;
      }

      const pageCount = Math.ceil(total / pageSize);
      const pagePromises = Array.from({ length: pageCount }, (_, i) =>
        supabase
          .from('words')
          .select('*')
          .eq('user_id', userId)
          .eq('user_language_id', languageId)
          .order('created_at', { ascending: false })
          .range(i * pageSize, (i + 1) * pageSize - 1)
      );

      const results = await Promise.all(pagePromises);
      const allWords: Word[] = [];
      for (const { data, error } of results) {
        if (error) throw error;
        if (data) allWords.push(...(data as Word[]));
      }

      setWords(allWords);
    } catch (error) {
      console.error('Error fetching words:', error);
    }
  }, [userId, languageId]);

  return { words, setWords, fetchWords };
};
