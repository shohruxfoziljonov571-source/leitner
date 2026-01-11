import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [channels, setChannels] = useState<RequiredChannel[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);

  // Check if user is admin
  const checkAdminStatus = useCallback(async () => {
    if (!user) {
      setIsAdmin(false);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });

      if (error) throw error;
      setIsAdmin(data === true);
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

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
        supabase.from('user_stats').select('today_reviewed'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo)
      ]);

      const totalReviews = reviewsData?.reduce((sum, s) => sum + (s.today_reviewed || 0), 0) || 0;

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

  // Fetch daily stats for chart
  const fetchDailyStats = useCallback(async () => {
    if (!isAdmin) return;

    try {
      const days = 14;
      const stats: DailyStats[] = [];
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        
        const [
          { count: newUsers },
          { data: dayStats },
          { count: newWords }
        ] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', dateStr).lt('created_at', new Date(date.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
          supabase.from('daily_stats').select('words_reviewed').eq('date', dateStr),
          supabase.from('words').select('*', { count: 'exact', head: true }).gte('created_at', dateStr).lt('created_at', new Date(date.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        ]);
        
        stats.push({
          date: dateStr,
          users: newUsers || 0,
          reviews: dayStats?.reduce((sum, s) => sum + (s.words_reviewed || 0), 0) || 0,
          newWords: newWords || 0
        });
      }
      
      setDailyStats(stats);
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

  useEffect(() => {
    checkAdminStatus();
  }, [checkAdminStatus]);

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
