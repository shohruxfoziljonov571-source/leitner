import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface LeaderboardEntry {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  xp: number;
  level: number;
  streak: number;
  totalWords: number;
  rank: number;
  isCurrentUser: boolean;
}

export const useLeaderboard = () => {
  const { user } = useAuth();
  const [globalLeaderboard, setGlobalLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [myRank, setMyRank] = useState<number | null>(null);

  const fetchGlobalLeaderboard = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      const { data, error } = await supabase.rpc('get_global_leaderboard', { p_limit: 50 });

      if (error) throw error;

      const leaderboard: LeaderboardEntry[] = (data || []).map((entry: any) => ({
        userId: entry.user_id,
        fullName: entry.full_name || 'Foydalanuvchi',
        avatarUrl: entry.avatar_url || null,
        xp: Number(entry.total_xp),
        level: entry.max_level,
        streak: entry.max_streak,
        totalWords: Number(entry.total_words),
        rank: Number(entry.rank),
        isCurrentUser: entry.user_id === user.id,
      }));

      const myEntry = leaderboard.find(e => e.isCurrentUser);
      if (myEntry) setMyRank(myEntry.rank);

      setGlobalLeaderboard(leaderboard);
    } catch (error) {
      console.error('Error fetching global leaderboard:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchGlobalLeaderboard();
  }, [fetchGlobalLeaderboard]);

  const getTopUsers = useCallback((limit: number = 10) => {
    return globalLeaderboard.slice(0, limit);
  }, [globalLeaderboard]);

  const getCurrentUserPosition = useCallback(() => {
    return globalLeaderboard.find(entry => entry.isCurrentUser);
  }, [globalLeaderboard]);

  return {
    globalLeaderboard,
    isLoading,
    myRank,
    getTopUsers,
    getCurrentUserPosition,
    refreshLeaderboard: fetchGlobalLeaderboard,
  };
};
