import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLearningLanguage } from '@/contexts/LearningLanguageContext';
import { toast } from 'sonner';
import { fireVictoryConfetti, fireGoldConfetti, fireSilverConfetti, fireBronzeConfetti } from '@/lib/confetti';

interface DuelWord {
  id: string;
  original_word: string;
  translated_word: string;
}

interface Duel {
  id: string;
  challenger_id: string;
  opponent_id: string;
  status: 'pending' | 'active' | 'completed' | 'declined' | 'expired';
  word_count: number;
  challenger_score: number;
  opponent_score: number;
  challenger_time_ms: number;
  opponent_time_ms: number;
  winner_id: string | null;
  current_word_index: number;
  words: DuelWord[];
  expires_at: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  challenger_name?: string;
  opponent_name?: string;
  challenger_avatar?: string;
  opponent_avatar?: string;
}

interface DuelResponse {
  id: string;
  duel_id: string;
  user_id: string;
  word_index: number;
  is_correct: boolean;
  response_time_ms: number;
}

export const useWordDuels = () => {
  const { user } = useAuth();
  const { activeLanguage } = useLearningLanguage();
  const [duels, setDuels] = useState<Duel[]>([]);
  const [activeDuel, setActiveDuel] = useState<Duel | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDuels = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('word_duels')
        .select('*')
        .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get profile info for all users
      const userIds = new Set<string>();
      data?.forEach(d => {
        userIds.add(d.challenger_id);
        userIds.add(d.opponent_id);
      });

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', Array.from(userIds));

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const enrichedDuels = (data || []).map(d => ({
        ...d,
        words: (d.words as unknown as DuelWord[]) || [],
        status: d.status as Duel['status'],
        challenger_name: profileMap.get(d.challenger_id)?.full_name || 'Noma\'lum',
        opponent_name: profileMap.get(d.opponent_id)?.full_name || 'Noma\'lum',
        challenger_avatar: profileMap.get(d.challenger_id)?.avatar_url,
        opponent_avatar: profileMap.get(d.opponent_id)?.avatar_url,
      }));

      setDuels(enrichedDuels);
    } catch (error) {
      console.error('Error fetching duels:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const createDuel = useCallback(async (opponentId: string, wordCount: number = 5) => {
    if (!user || !activeLanguage) return null;

    try {
      // Get random words from user's collection
      const { data: words, error: wordsError } = await supabase
        .from('words')
        .select('id, original_word, translated_word')
        .eq('user_id', user.id)
        .eq('user_language_id', activeLanguage.id)
        .limit(50);

      if (wordsError) throw wordsError;

      if (!words || words.length < wordCount) {
        toast.error(`Kamida ${wordCount} ta so'z kerak!`);
        return null;
      }

      // Shuffle and pick random words
      const shuffled = [...words].sort(() => Math.random() - 0.5);
      const selectedWords = shuffled.slice(0, wordCount).map(w => ({
        id: w.id,
        original_word: w.original_word,
        translated_word: w.translated_word,
      }));

      const { data: duel, error } = await supabase
        .from('word_duels')
        .insert({
          challenger_id: user.id,
          opponent_id: opponentId,
          word_count: wordCount,
          words: selectedWords,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Duel yuborildi!');
      
      // Send Telegram notification
      try {
        await supabase.functions.invoke('notify-duel', {
          body: { type: 'duel_invite', duel_id: duel.id, user_id: opponentId },
        });
      } catch (e) {
        console.log('Telegram notification failed:', e);
      }

      await fetchDuels();
      return duel;
    } catch (error) {
      console.error('Error creating duel:', error);
      toast.error('Duel yaratishda xatolik');
      return null;
    }
  }, [user, activeLanguage, fetchDuels]);

  const acceptDuel = useCallback(async (duelId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('word_duels')
        .update({
          status: 'active',
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', duelId)
        .eq('opponent_id', user.id);

      if (error) throw error;

      toast.success('Duel boshlandi!');
      
      // Send Telegram notification
      try {
        await supabase.functions.invoke('notify-duel', {
          body: { type: 'duel_accepted', duel_id: duelId },
        });
      } catch (e) {
        console.log('Telegram notification failed:', e);
      }

      await fetchDuels();
      return true;
    } catch (error) {
      console.error('Error accepting duel:', error);
      return false;
    }
  }, [user, fetchDuels]);

  const declineDuel = useCallback(async (duelId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('word_duels')
        .update({
          status: 'declined',
          updated_at: new Date().toISOString(),
        })
        .eq('id', duelId)
        .eq('opponent_id', user.id);

      if (error) throw error;

      toast.info('Duel rad etildi');
      
      // Send Telegram notification
      try {
        await supabase.functions.invoke('notify-duel', {
          body: { type: 'duel_declined', duel_id: duelId, user_id: user.id },
        });
      } catch (e) {
        console.log('Telegram notification failed:', e);
      }

      await fetchDuels();
      return true;
    } catch (error) {
      console.error('Error declining duel:', error);
      return false;
    }
  }, [user, fetchDuels]);

  const submitAnswer = useCallback(async (
    duelId: string,
    wordIndex: number,
    isCorrect: boolean,
    responseTimeMs: number
  ) => {
    if (!user) return false;

    try {
      // Insert response
      const { error: responseError } = await supabase
        .from('duel_responses')
        .insert({
          duel_id: duelId,
          user_id: user.id,
          word_index: wordIndex,
          is_correct: isCorrect,
          response_time_ms: responseTimeMs,
        });

      if (responseError) throw responseError;

      // Get current duel state
      const { data: duel, error: duelError } = await supabase
        .from('word_duels')
        .select('*')
        .eq('id', duelId)
        .single();

      if (duelError) throw duelError;

      const isChallenger = duel.challenger_id === user.id;
      const scoreField = isChallenger ? 'challenger_score' : 'opponent_score';
      const timeField = isChallenger ? 'challenger_time_ms' : 'opponent_time_ms';
      
      const newScore = (isChallenger ? duel.challenger_score : duel.opponent_score) + (isCorrect ? 1 : 0);
      const newTime = (isChallenger ? duel.challenger_time_ms : duel.opponent_time_ms) + responseTimeMs;

      // Update duel scores
      const updateData: Record<string, unknown> = {
        [scoreField]: newScore,
        [timeField]: newTime,
        updated_at: new Date().toISOString(),
      };

      // Check if both players have answered all words
      const { data: allResponses } = await supabase
        .from('duel_responses')
        .select('*')
        .eq('duel_id', duelId);

      const challengerDone = (allResponses || []).filter(r => r.user_id === duel.challenger_id).length >= duel.word_count;
      const opponentDone = (allResponses || []).filter(r => r.user_id === duel.opponent_id).length >= duel.word_count;

      if (challengerDone && opponentDone) {
        // Both finished - determine winner
        const finalChallengerScore = isChallenger ? newScore : duel.challenger_score;
        const finalOpponentScore = isChallenger ? duel.opponent_score : newScore;
        const finalChallengerTime = isChallenger ? newTime : duel.challenger_time_ms;
        const finalOpponentTime = isChallenger ? duel.opponent_time_ms : newTime;

        let winnerId = null;
        if (finalChallengerScore > finalOpponentScore) {
          winnerId = duel.challenger_id;
        } else if (finalOpponentScore > finalChallengerScore) {
          winnerId = duel.opponent_id;
        } else if (finalChallengerTime < finalOpponentTime) {
          winnerId = duel.challenger_id;
        } else if (finalOpponentTime < finalChallengerTime) {
          winnerId = duel.opponent_id;
        }

        updateData.status = 'completed';
        updateData.winner_id = winnerId;
        updateData.completed_at = new Date().toISOString();

        // Fire confetti for winner
        if (winnerId === user.id) {
          const myScore = isChallenger ? finalChallengerScore : finalOpponentScore;
          const accuracy = myScore / duel.word_count;
          
          if (accuracy >= 0.8) {
            fireGoldConfetti();
          } else if (accuracy >= 0.6) {
            fireSilverConfetti();
          } else {
            fireBronzeConfetti();
          }
          toast.success('🏆 Tabriklaymiz, siz g\'olib!');
        } else if (!winnerId) {
          fireVictoryConfetti();
          toast.info('🤝 Durrang!');
        } else {
          toast.info('Keyingi safar omad!');
        }

        // Send Telegram notification
        try {
          await supabase.functions.invoke('notify-duel', {
            body: { type: 'duel_completed', duel_id: duelId },
          });
        } catch (e) {
          console.log('Telegram notification failed:', e);
        }
      }

      await supabase
        .from('word_duels')
        .update(updateData)
        .eq('id', duelId);

      await fetchDuels();
      return true;
    } catch (error) {
      console.error('Error submitting answer:', error);
      return false;
    }
  }, [user, fetchDuels]);

  const startDuel = useCallback((duel: Duel) => {
    setActiveDuel(duel);
  }, []);

  const endDuel = useCallback(() => {
    setActiveDuel(null);
    fetchDuels();
  }, [fetchDuels]);

  // Subscribe to realtime updates with debouncing
  useEffect(() => {
    if (!user) return;

    let debounceTimer: NodeJS.Timeout | null = null;
    
    const debouncedFetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchDuels();
      }, 500);
    };

    const channel = supabase
      .channel(`duels-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'word_duels',
        },
        (payload: any) => {
          // Only refetch if this duel involves the current user
          if (payload.new?.challenger_id === user.id || 
              payload.new?.opponent_id === user.id ||
              payload.old?.challenger_id === user.id ||
              payload.old?.opponent_id === user.id) {
            debouncedFetch();
          }
        }
      )
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [user, fetchDuels]);

  useEffect(() => {
    fetchDuels();
  }, [fetchDuels]);

  const pendingDuels = duels.filter(d => d.status === 'pending' && d.opponent_id === user?.id);
  const activeDuels = duels.filter(d => d.status === 'active');
  const completedDuels = duels.filter(d => d.status === 'completed');

  return {
    duels,
    pendingDuels,
    activeDuels,
    completedDuels,
    activeDuel,
    isLoading,
    createDuel,
    acceptDuel,
    declineDuel,
    submitAnswer,
    startDuel,
    endDuel,
    refetch: fetchDuels,
  };
};
