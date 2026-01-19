import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Contest {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
  contest_type: string;
  winner_count: number;
  prizes: { place: number; prize: string }[];
  min_referrals: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface ContestParticipant {
  id: string;
  contest_id: string;
  user_id: string;
  telegram_chat_id: number | null;
  telegram_username: string | null;
  joined_at: string;
  referral_count: number;
  xp_earned: number;
  words_added: number;
  full_name?: string;
  rank?: number;
}

export interface ContestReferral {
  id: string;
  contest_id: string;
  referrer_user_id: string;
  referred_user_id: string;
  referred_telegram_chat_id: number | null;
  is_valid: boolean;
  validated_at: string | null;
  created_at: string;
  referred_name?: string;
  referred_username?: string;
}

export const useContests = () => {
  const { user } = useAuth();
  const [contests, setContests] = useState<Contest[]>([]);
  const [participants, setParticipants] = useState<ContestParticipant[]>([]);
  const [referrals, setReferrals] = useState<ContestReferral[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeContest, setActiveContest] = useState<Contest | null>(null);

  // Fetch all contests (admin)
  const fetchContests = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('contests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Cast prizes to the correct type
      const contestsWithPrizes = (data || []).map(contest => ({
        ...contest,
        prizes: (contest.prizes || []) as { place: number; prize: string }[]
      }));
      
      setContests(contestsWithPrizes);

      // Set active contest
      const active = contestsWithPrizes.find(
        c => c.is_active && new Date(c.start_date) <= new Date() && new Date(c.end_date) > new Date()
      );
      setActiveContest(active || null);
    } catch (error) {
      console.error('Error fetching contests:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch participants for a contest
  const fetchParticipants = useCallback(async (contestId: string) => {
    try {
      const { data, error } = await supabase
        .from('contest_participants')
        .select('*')
        .eq('contest_id', contestId)
        .order('referral_count', { ascending: false });

      if (error) throw error;

      // Get user names
      const userIds = data?.map(p => p.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      const participantsWithNames = (data || []).map((p, index) => ({
        ...p,
        full_name: profileMap.get(p.user_id) || 'Noma\'lum',
        rank: index + 1
      }));

      setParticipants(participantsWithNames);
      return participantsWithNames;
    } catch (error) {
      console.error('Error fetching participants:', error);
      return [];
    }
  }, []);

  // Fetch referrals for a participant
  const fetchReferrals = useCallback(async (contestId: string, userId: string) => {
    try {
      const { data, error } = await supabase
        .from('contest_referrals')
        .select('*')
        .eq('contest_id', contestId)
        .eq('referrer_user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get referred user names
      const referredIds = data?.map(r => r.referred_user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, telegram_username')
        .in('user_id', referredIds);

      const profileMap = new Map(
        profiles?.map(p => [p.user_id, { name: p.full_name, username: p.telegram_username }]) || []
      );

      const referralsWithNames = (data || []).map(r => ({
        ...r,
        referred_name: profileMap.get(r.referred_user_id)?.name || 'Noma\'lum',
        referred_username: profileMap.get(r.referred_user_id)?.username || null
      }));

      setReferrals(referralsWithNames);
      return referralsWithNames;
    } catch (error) {
      console.error('Error fetching referrals:', error);
      return [];
    }
  }, []);

  // Create contest (admin)
  const createContest = async (contest: Omit<Contest, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
    try {
      const { data, error } = await supabase
        .from('contests')
        .insert({
          ...contest,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;
      await fetchContests();
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  // Update contest (admin)
  const updateContest = async (id: string, updates: Partial<Contest>) => {
    try {
      const { error } = await supabase
        .from('contests')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      await fetchContests();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  // Toggle contest active status
  const toggleContest = async (id: string, isActive: boolean) => {
    return updateContest(id, { is_active: isActive });
  };

  // Delete contest (admin)
  const deleteContest = async (id: string) => {
    try {
      const { error } = await supabase
        .from('contests')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchContests();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  // Get contest statistics
  const getContestStats = useCallback(async (contestId: string) => {
    try {
      const [participantsResult, referralsResult] = await Promise.all([
        supabase
          .from('contest_participants')
          .select('*', { count: 'exact' })
          .eq('contest_id', contestId),
        supabase
          .from('contest_referrals')
          .select('*', { count: 'exact' })
          .eq('contest_id', contestId)
      ]);

      const validReferrals = referralsResult.data?.filter(r => r.is_valid).length || 0;
      const totalReferrals = referralsResult.count || 0;

      return {
        totalParticipants: participantsResult.count || 0,
        totalReferrals,
        validReferrals,
        conversionRate: totalReferrals > 0 ? Math.round((validReferrals / totalReferrals) * 100) : 0
      };
    } catch (error) {
      console.error('Error getting contest stats:', error);
      return { totalParticipants: 0, totalReferrals: 0, validReferrals: 0, conversionRate: 0 };
    }
  }, []);

  useEffect(() => {
    fetchContests();
  }, [fetchContests]);

  return {
    contests,
    participants,
    referrals,
    activeContest,
    isLoading,
    fetchContests,
    fetchParticipants,
    fetchReferrals,
    createContest,
    updateContest,
    toggleContest,
    deleteContest,
    getContestStats
  };
};
