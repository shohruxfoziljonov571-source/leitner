import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface MemoryPalace {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  rooms_count: number;
  created_at: string;
}

interface PalaceRoom {
  id: string;
  palace_id: string;
  name: string;
  position: number;
  description: string | null;
  created_at: string;
  words?: RoomWordPlacement[];
}

interface RoomWordPlacement {
  id: string;
  room_id: string;
  word_id: string;
  position: number;
  visual_note: string | null;
  word?: {
    original_word: string;
    translated_word: string;
  };
}

interface WordStory {
  id: string;
  title: string;
  story_text: string;
  created_at: string;
  words?: StoryWord[];
}

interface StoryWord {
  id: string;
  story_id: string;
  word_id: string;
  position: number;
  word?: {
    original_word: string;
    translated_word: string;
  };
}

export const useMnemonics = () => {
  const { user } = useAuth();
  const [palaces, setPalaces] = useState<MemoryPalace[]>([]);
  const [stories, setStories] = useState<WordStory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all memory palaces
  const fetchPalaces = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('memory_palaces')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPalaces(data || []);
    } catch (error) {
      console.error('Error fetching palaces:', error);
    }
  }, [user]);

  // Fetch all word stories
  const fetchStories = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('word_stories')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStories(data || []);
    } catch (error) {
      console.error('Error fetching stories:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      Promise.all([fetchPalaces(), fetchStories()]).finally(() => {
        setIsLoading(false);
      });
    }
  }, [user, fetchPalaces, fetchStories]);

  // ============ MEMORY PALACE FUNCTIONS ============

  const createPalace = useCallback(async (palace: { name: string; description?: string; rooms_count?: number }) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('memory_palaces')
        .insert({
          user_id: user.id,
          name: palace.name,
          description: palace.description || null,
          rooms_count: palace.rooms_count || 5,
        })
        .select()
        .single();

      if (error) throw error;

      // Create default rooms
      const roomsToCreate = Array.from({ length: palace.rooms_count || 5 }, (_, i) => ({
        palace_id: data.id,
        name: `Xona ${i + 1}`,
        position: i,
      }));

      await supabase.from('palace_rooms').insert(roomsToCreate);

      setPalaces(prev => [data, ...prev]);
      return data;
    } catch (error) {
      console.error('Error creating palace:', error);
      return null;
    }
  }, [user]);

  const deletePalace = useCallback(async (palaceId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('memory_palaces')
        .delete()
        .eq('id', palaceId);

      if (error) throw error;
      setPalaces(prev => prev.filter(p => p.id !== palaceId));
    } catch (error) {
      console.error('Error deleting palace:', error);
    }
  }, [user]);

  const getPalaceRooms = useCallback(async (palaceId: string): Promise<PalaceRoom[]> => {
    try {
      const { data: rooms, error } = await supabase
        .from('palace_rooms')
        .select('*')
        .eq('palace_id', palaceId)
        .order('position', { ascending: true });

      if (error) throw error;

      // Fetch placements for each room
      const roomsWithWords = await Promise.all((rooms || []).map(async (room) => {
        const { data: placements } = await supabase
          .from('room_word_placements')
          .select(`
            *,
            words:word_id (original_word, translated_word)
          `)
          .eq('room_id', room.id)
          .order('position', { ascending: true });

        return {
          ...room,
          words: (placements || []).map(p => ({
            ...p,
            word: p.words as { original_word: string; translated_word: string } | undefined,
          })),
        };
      }));

      return roomsWithWords;
    } catch (error) {
      console.error('Error fetching palace rooms:', error);
      return [];
    }
  }, []);

  const placeWordInRoom = useCallback(async (roomId: string, wordId: string, visualNote?: string) => {
    try {
      // Get current max position
      const { data: existing } = await supabase
        .from('room_word_placements')
        .select('position')
        .eq('room_id', roomId)
        .order('position', { ascending: false })
        .limit(1);

      const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0;

      const { data, error } = await supabase
        .from('room_word_placements')
        .insert({
          room_id: roomId,
          word_id: wordId,
          position: nextPosition,
          visual_note: visualNote || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error placing word in room:', error);
      return null;
    }
  }, []);

  const removeWordFromRoom = useCallback(async (placementId: string) => {
    try {
      const { error } = await supabase
        .from('room_word_placements')
        .delete()
        .eq('id', placementId);

      if (error) throw error;
    } catch (error) {
      console.error('Error removing word from room:', error);
    }
  }, []);

  const updatePlacementNote = useCallback(async (placementId: string, visualNote: string) => {
    try {
      const { error } = await supabase
        .from('room_word_placements')
        .update({ visual_note: visualNote })
        .eq('id', placementId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating placement note:', error);
    }
  }, []);

  // ============ WORD STORY FUNCTIONS ============

  const createStory = useCallback(async (story: { title: string; story_text: string; wordIds?: string[] }) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('word_stories')
        .insert({
          user_id: user.id,
          title: story.title,
          story_text: story.story_text,
        })
        .select()
        .single();

      if (error) throw error;

      // Link words to story
      if (story.wordIds && story.wordIds.length > 0) {
        const storyWordsToInsert = story.wordIds.map((wordId, index) => ({
          story_id: data.id,
          word_id: wordId,
          position: index,
        }));

        await supabase.from('story_words').insert(storyWordsToInsert);
      }

      setStories(prev => [data, ...prev]);
      return data;
    } catch (error) {
      console.error('Error creating story:', error);
      return null;
    }
  }, [user]);

  const updateStory = useCallback(async (storyId: string, updates: { title?: string; story_text?: string }) => {
    try {
      const { error } = await supabase
        .from('word_stories')
        .update(updates)
        .eq('id', storyId);

      if (error) throw error;

      setStories(prev => prev.map(s => 
        s.id === storyId ? { ...s, ...updates } : s
      ));
    } catch (error) {
      console.error('Error updating story:', error);
    }
  }, []);

  const deleteStory = useCallback(async (storyId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('word_stories')
        .delete()
        .eq('id', storyId);

      if (error) throw error;
      setStories(prev => prev.filter(s => s.id !== storyId));
    } catch (error) {
      console.error('Error deleting story:', error);
    }
  }, [user]);

  const getStoryWords = useCallback(async (storyId: string): Promise<StoryWord[]> => {
    try {
      const { data, error } = await supabase
        .from('story_words')
        .select(`
          *,
          words:word_id (original_word, translated_word)
        `)
        .eq('story_id', storyId)
        .order('position', { ascending: true });

      if (error) throw error;

      return (data || []).map(sw => ({
        ...sw,
        word: sw.words as { original_word: string; translated_word: string } | undefined,
      }));
    } catch (error) {
      console.error('Error fetching story words:', error);
      return [];
    }
  }, []);

  const addWordToStory = useCallback(async (storyId: string, wordId: string) => {
    try {
      // Get current max position
      const { data: existing } = await supabase
        .from('story_words')
        .select('position')
        .eq('story_id', storyId)
        .order('position', { ascending: false })
        .limit(1);

      const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0;

      const { data, error } = await supabase
        .from('story_words')
        .insert({
          story_id: storyId,
          word_id: wordId,
          position: nextPosition,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding word to story:', error);
      return null;
    }
  }, []);

  const removeWordFromStory = useCallback(async (storyWordId: string) => {
    try {
      const { error } = await supabase
        .from('story_words')
        .delete()
        .eq('id', storyWordId);

      if (error) throw error;
    } catch (error) {
      console.error('Error removing word from story:', error);
    }
  }, []);

  // ============ MNEMONIC HINT (directly on word) ============

  const updateWordMnemonicHint = useCallback(async (wordId: string, hint: string) => {
    try {
      const { error } = await supabase
        .from('words')
        .update({ mnemonic_hint: hint })
        .eq('id', wordId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating mnemonic hint:', error);
      return false;
    }
  }, []);

  return {
    // Data
    palaces,
    stories,
    isLoading,

    // Memory Palace
    createPalace,
    deletePalace,
    getPalaceRooms,
    placeWordInRoom,
    removeWordFromRoom,
    updatePlacementNote,

    // Word Stories
    createStory,
    updateStory,
    deleteStory,
    getStoryWords,
    addWordToStory,
    removeWordFromStory,

    // Mnemonic Hint
    updateWordMnemonicHint,

    // Refetch
    refetch: () => Promise.all([fetchPalaces(), fetchStories()]),
  };
};
