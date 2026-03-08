import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Word, UserStats } from './types';

interface CRUDDeps {
  userId: string | undefined;
  languageId: string | undefined;
  words: Word[];
  setWords: React.Dispatch<React.SetStateAction<Word[]>>;
  setStats: React.Dispatch<React.SetStateAction<UserStats>>;
}

export const useWordsCRUD = ({ userId, languageId, words, setWords, setStats }: CRUDDeps) => {
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
    if (!userId || !languageId) return null;

    try {
      const { data, error } = await supabase
        .from('words')
        .insert({
          user_id: userId,
          user_language_id: languageId,
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

      if (error) {
        // Unique constraint violation = duplicate word
        if (error.code === '23505') {
          return { error: 'duplicate' as const, existingWord: word.original_word };
        }
        throw error;
      }

      setWords(prev => [data as Word, ...prev]);

      await supabase.rpc('increment_total_words', {
        p_user_id: userId,
        p_language_id: languageId,
        p_delta: 1,
      });

      setStats(prev => ({ ...prev, total_words: prev.total_words + 1 }));

      return data;
    } catch (error: any) {
      console.error('Error adding word:', error);
      throw new Error(error?.message || 'So\'z qo\'shishda xatolik yuz berdi');
    }
  }, [userId, languageId, checkDuplicate, setWords, setStats]);

  const addWordsBulk = useCallback(async (wordsToAdd: {
    original_word: string;
    translated_word: string;
    source_language: string;
    target_language: string;
    example_sentences?: string[];
    category_id?: string | null;
  }[]) => {
    if (!userId || !languageId || wordsToAdd.length === 0) return { added: [], duplicates: [] };

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
          user_id: userId,
          user_language_id: languageId,
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

        if (error) {
          // If unique constraint violation during bulk, skip and continue
          if (error.code === '23505') {
            // Insert one-by-one to find which ones succeed
            for (const singleWord of wordsData) {
              const { data: singleData, error: singleError } = await supabase
                .from('words')
                .insert(singleWord)
                .select()
                .single();
              if (!singleError && singleData) {
                allInserted.push(singleData as Word);
              } else if (singleError && singleError.code !== '23505') {
                console.error('Error inserting word:', singleError);
              }
            }
            continue;
          }
          throw error;
        }
        if (data) allInserted.push(...(data as Word[]));
      }

      setWords(prev => [...allInserted, ...prev]);
      setStats(prev => ({ ...prev, total_words: prev.total_words + allInserted.length }));

      await supabase.rpc('increment_total_words', {
        p_user_id: userId,
        p_language_id: languageId,
        p_delta: allInserted.length,
      });

      return { added: allInserted, duplicates };
    } catch (error: any) {
      console.error('Error bulk adding words:', error);
      throw new Error(error?.message || 'So\'zlarni qo\'shishda xatolik yuz berdi');
    }
  }, [userId, languageId, words, setWords, setStats]);

  const updateWord = useCallback(async (wordId: string, updates: {
    original_word?: string;
    translated_word?: string;
    example_sentences?: string[];
    category_id?: string | null;
  }) => {
    if (!userId || !languageId) return null;

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
  }, [userId, languageId, setWords]);

  const deleteWord = useCallback(async (wordId: string) => {
    if (!userId || !languageId) return;

    const wordToDelete = words.find(w => w.id === wordId);
    const wasMastered = wordToDelete && wordToDelete.box_number >= 5;

    try {
      const { error } = await supabase
        .from('words')
        .delete()
        .eq('id', wordId);

      if (error) throw error;

      setWords(prev => prev.filter(w => w.id !== wordId));

      await supabase.rpc('increment_total_words', {
        p_user_id: userId,
        p_language_id: languageId,
        p_delta: -1,
      });

      if (wasMastered) {
        await supabase.rpc('decrement_learned_words', {
          p_user_id: userId,
          p_language_id: languageId,
          p_delta: 1,
        });
        setStats(prev => ({
          ...prev,
          total_words: Math.max(0, prev.total_words - 1),
          learned_words: Math.max(0, prev.learned_words - 1),
        }));
      } else {
        setStats(prev => ({ ...prev, total_words: Math.max(0, prev.total_words - 1) }));
      }
    } catch (error) {
      console.error('Error deleting word:', error);
    }
  }, [userId, languageId, words, setWords, setStats]);

  return { addWord, addWordsBulk, updateWord, deleteWord, checkDuplicate };
};
