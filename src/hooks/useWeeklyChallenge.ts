import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Challenge {
  id: string;
  week_start: string;
  week_end: string;
  is_active: boolean;
}

interface Participant {
  user_id: string;
  xp_earned: number;
  words_reviewed: number;
  words_correct: number;
  days_active: number;
  rank?: number;
  full_name?: string;
  avatar_url?: string;
}

interface ChallengeData {
  challenge: Challenge | null;
  participants: Participant[];
  userParticipation: Participant | null;
  userRank: number | null;
  daysLeft: number;
  isLoading: boolean;
}

export const useWeeklyChallenge = () => {
  const { user } = useAuth();
  const [data, setData] = useState<ChallengeData>({
    challenge: null,
    participants: [],
    userParticipation: null,
    userRank: null,
    daysLeft: 0,
    isLoading: true,
  });

  const fetchChallenge = useCallback(async () => {
    if (!user) return;

    try {
      // Get or create current week's challenge
      const { data: challengeId } = await supabase.rpc('get_or_create_weekly_challenge');

      if (!challengeId) {
        setData(prev => ({ ...prev, isLoading: false }));
        return;
      }

      // Fetch challenge and participants in parallel
      const [challengeResult, participantsResult] = await Promise.all([
        supabase
          .from('weekly_challenges')
          .select('*')
          .eq('id', challengeId)
          .maybeSingle(),
        supabase
          .from('weekly_challenge_participants')
          .select('*')
          .eq('challenge_id', challengeId)
          .order('xp_earned', { ascending: false }),
      ]);

      const challenge = challengeResult.data;
      const participants = participantsResult.data || [];

      // Get profile info for participants
      const userIds = participants.map(p => p.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Enrich participants with profile info and rank
      const enrichedParticipants = participants.map((p, index) => ({
        ...p,
        rank: index + 1,
        full_name: profileMap.get(p.user_id)?.full_name || 'Noma\'lum',
        avatar_url: profileMap.get(p.user_id)?.avatar_url,
      }));

      // Find user's participation
      const userParticipation = enrichedParticipants.find(p => p.user_id === user.id) || null;
      const userRank = userParticipation?.rank || null;

      // Calculate days left
      let daysLeft = 0;
      if (challenge?.week_end) {
        const endDate = new Date(challenge.week_end);
        endDate.setHours(23, 59, 59);
        const now = new Date();
        daysLeft = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      }

      setData({
        challenge,
        participants: enrichedParticipants,
        userParticipation,
        userRank,
        daysLeft,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error fetching challenge:', error);
      setData(prev => ({ ...prev, isLoading: false }));
    }
  }, [user]);

  const joinChallenge = useCallback(async () => {
    if (!user || !data.challenge) return false;

    try {
      const { error } = await supabase
        .from('weekly_challenge_participants')
        .upsert({
          challenge_id: data.challenge.id,
          user_id: user.id,
          xp_earned: 0,
          words_reviewed: 0,
          words_correct: 0,
          days_active: 0,
        }, { onConflict: 'challenge_id,user_id' });

      if (error) throw error;

      await fetchChallenge();
      return true;
    } catch (error) {
      console.error('Error joining challenge:', error);
      return false;
    }
  }, [user, data.challenge, fetchChallenge]);

  const updateParticipantStats = useCallback(async (xpEarned: number, wordsReviewed: number, wordsCorrect: number) => {
    if (!user || !data.challenge || !data.userParticipation) return;

    try {
      await supabase
        .from('weekly_challenge_participants')
        .update({
          xp_earned: data.userParticipation.xp_earned + xpEarned,
          words_reviewed: data.userParticipation.words_reviewed + wordsReviewed,
          words_correct: data.userParticipation.words_correct + wordsCorrect,
          updated_at: new Date().toISOString(),
        })
        .eq('challenge_id', data.challenge.id)
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error updating participant stats:', error);
    }
  }, [user, data.challenge, data.userParticipation]);

  useEffect(() => {
    fetchChallenge();
  }, [fetchChallenge]);

  return {
    ...data,
    joinChallenge,
    updateParticipantStats,
    refetch: fetchChallenge,
  };
};
