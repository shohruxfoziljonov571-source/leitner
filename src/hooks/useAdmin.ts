import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminContext } from '@/contexts/AdminContext';

interface AdminStats {
  totalUsers: number;
  activeToday: number;
  totalWords: number;
  totalReviews: number;
  newUsersThisWeek: number;
  avgWordsPerUser: number;
}

interface RequiredChannel {
  id: string;
  channel_id: string;
  channel_name: string;
  channel_username: string;
  channel_url: string;
  is_active: boolean;
  created_at: string;
}

interface Referral {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  clicks: number;
  registrations: number;
  created_at: string;
}

interface DailyStats {
  date: string;
  users: number;
  reviews: number;
  newWords: number;
}

export const useAdmin = () => {
  const { user } = useAuth();
  // Re-use cached result from AdminContext — no extra RPC call
  const { isAdmin, isAdminLoading: isLoading } = useAdminContext();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [channels, setChannels] = useState<RequiredChannel[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);

  // Fetch admin statistics
  const fetchStats = useCallback(async () => {
    if (!isAdmin) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Fetch all stats in parallel
      const [
        { count: totalUsers },
        { count: activeToday },
        { count: totalWords },
        { data: reviewsData },
        { count: newUsersThisWeek }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('user_stats').select('*', { count: 'exact', head: true }).eq('last_active_date', today),
        supabase.from('words').select('*', { count: 'exact', head: true }),
        // Use words.times_reviewed for GLOBAL total reviews (not just today)
        supabase.from('words').select('times_reviewed'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo)
      ]);

      const totalReviews = reviewsData?.reduce((sum, w) => sum + (w.times_reviewed || 0), 0) || 0;

      setStats({
        totalUsers: totalUsers || 0,
        activeToday: activeToday || 0,
        totalWords: totalWords || 0,
        totalReviews,
        newUsersThisWeek: newUsersThisWeek || 0,
        avgWordsPerUser: totalUsers ? Math.round((totalWords || 0) / totalUsers) : 0
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    }
  }, [isAdmin]);

  // Fetch daily stats for chart — single batch query per dataset
  const fetchDailyStats = useCallback(async () => {
    if (!isAdmin) return;

    try {
      const days = 14;
      const dateFrom = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const dateTo = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Single queries instead of 14×3 individual requests
      const [
        { data: profilesData },
        { data: dailyStatsData },
        { data: wordsData }
      ] = await Promise.all([
        supabase.from('profiles').select('created_at').gte('created_at', dateFrom).lt('created_at', dateTo),
        supabase.from('daily_stats').select('date, words_reviewed').gte('date', dateFrom).lte('date', dateTo),
        supabase.from('words').select('created_at').gte('created_at', dateFrom).lt('created_at', dateTo)
      ]);

      // Build per-day aggregates in JS
      const statsMap: Record<string, DailyStats> = {};
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        statsMap[d] = { date: d, users: 0, reviews: 0, newWords: 0 };
      }

      profilesData?.forEach(p => {
        const d = p.created_at.split('T')[0];
        if (statsMap[d]) statsMap[d].users++;
      });

      dailyStatsData?.forEach(s => {
        if (statsMap[s.date]) statsMap[s.date].reviews += (s.words_reviewed || 0);
      });

      wordsData?.forEach(w => {
        const d = w.created_at.split('T')[0];
        if (statsMap[d]) statsMap[d].newWords++;
      });

      setDailyStats(Object.values(statsMap));
    } catch (error) {
      console.error('Error fetching daily stats:', error);
    }
  }, [isAdmin]);

  // Fetch channels
  const fetchChannels = useCallback(async () => {
    if (!isAdmin) return;

    try {
      const { data, error } = await supabase
        .from('required_channels')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChannels(data || []);
    } catch (error) {
      console.error('Error fetching channels:', error);
    }
  }, [isAdmin]);

  // Fetch referrals
  const fetchReferrals = useCallback(async () => {
    if (!isAdmin) return;

    try {
      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReferrals(data || []);
    } catch (error) {
      console.error('Error fetching referrals:', error);
    }
  }, [isAdmin]);

  // Add channel
  const addChannel = async (channel: Omit<RequiredChannel, 'id' | 'created_at' | 'is_active'>) => {
    try {
      const { error } = await supabase
        .from('required_channels')
        .insert({
          channel_id: channel.channel_id,
          channel_name: channel.channel_name,
          channel_username: channel.channel_username,
          channel_url: channel.channel_url,
          is_active: true
        });

      if (error) throw error;
      await fetchChannels();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  // Toggle channel status
  const toggleChannel = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('required_channels')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
      await fetchChannels();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  // Delete channel
  const deleteChannel = async (id: string) => {
    try {
      const { error } = await supabase
        .from('required_channels')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchChannels();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  // Add referral
  const addReferral = async (referral: { name: string; description?: string; code: string }) => {
    try {
      const { error } = await supabase
        .from('referrals')
        .insert({
          code: referral.code,
          name: referral.name,
          description: referral.description || null,
          is_active: true
        });

      if (error) throw error;
      await fetchReferrals();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  // Toggle referral status
  const toggleReferral = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('referrals')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
      await fetchReferrals();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  // Delete referral
  const deleteReferral = async (id: string) => {
    try {
      const { error } = await supabase
        .from('referrals')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchReferrals();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  // Admin check is now handled by AdminContext — no separate useEffect needed

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
      fetchChannels();
      fetchReferrals();
      fetchDailyStats();
    }
  }, [isAdmin, fetchStats, fetchChannels, fetchReferrals, fetchDailyStats]);

  return {
    isAdmin,
    isLoading,
    stats,
    channels,
    referrals,
    dailyStats,
    addChannel,
    toggleChannel,
    deleteChannel,
    addReferral,
    toggleReferral,
    deleteReferral,
    refreshStats: fetchStats,
    refreshChannels: fetchChannels,
    refreshReferrals: fetchReferrals
  };
};
