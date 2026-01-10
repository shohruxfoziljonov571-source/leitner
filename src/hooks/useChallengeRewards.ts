import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGamification } from '@/hooks/useGamification';
import { toast } from 'sonner';

interface Reward {
  id: string;
  challenge_id: string;
  user_id: string;
  rank: number;
  badge_type: 'gold' | 'silver' | 'bronze';
  bonus_xp: number;
  claimed_at: string | null;
  created_at: string;
  week_start?: string;
  week_end?: string;
}

export const useChallengeRewards = () => {
  const { user } = useAuth();
  const { addXp } = useGamification();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [unclaimedRewards, setUnclaimedRewards] = useState<Reward[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRewards = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('challenge_rewards')
        .select(`
          *,
          weekly_challenges (week_start, week_end)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const enrichedRewards = (data || []).map(r => ({
        ...r,
        badge_type: r.badge_type as Reward['badge_type'],
        week_start: r.weekly_challenges?.week_start,
        week_end: r.weekly_challenges?.week_end,
      }));

      setRewards(enrichedRewards);
      setUnclaimedRewards(enrichedRewards.filter(r => !r.claimed_at));
    } catch (error) {
      console.error('Error fetching rewards:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const claimReward = useCallback(async (rewardId: string) => {
    if (!user) return false;

    try {
      const reward = rewards.find(r => r.id === rewardId);
      if (!reward || reward.claimed_at) return false;

      // Update reward as claimed
      const { error } = await supabase
        .from('challenge_rewards')
        .update({ claimed_at: new Date().toISOString() })
        .eq('id', rewardId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Add bonus XP
      await addXp(reward.bonus_xp, 'challenge_reward');

      const badgeEmoji = reward.badge_type === 'gold' ? '🥇' : reward.badge_type === 'silver' ? '🥈' : '🥉';
      toast.success(`${badgeEmoji} +${reward.bonus_xp} XP olindi!`);

      await fetchRewards();
      return true;
    } catch (error) {
      console.error('Error claiming reward:', error);
      toast.error('Sovg\'ani olishda xatolik');
      return false;
    }
  }, [user, rewards, addXp, fetchRewards]);

  const getTotalBadges = useCallback(() => {
    return {
      gold: rewards.filter(r => r.badge_type === 'gold').length,
      silver: rewards.filter(r => r.badge_type === 'silver').length,
      bronze: rewards.filter(r => r.badge_type === 'bronze').length,
    };
  }, [rewards]);

  useEffect(() => {
    fetchRewards();
  }, [fetchRewards]);

  return {
    rewards,
    unclaimedRewards,
    isLoading,
    claimReward,
    getTotalBadges,
    refetch: fetchRewards,
  };
};
