import { useState, useEffect, useCallback } from 'react';
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

      // Get all users' aggregated stats
      const { data: allStats, error: statsError } = await supabase
        .from('user_stats')
        .select('user_id, xp, level, streak, total_words');

      if (statsError) throw statsError;

      // Aggregate stats by user
      const userStatsMap = new Map<string, {
        xp: number;
        level: number;
        streak: number;
        totalWords: number;
      }>();

      for (const stat of allStats || []) {
        const existing = userStatsMap.get(stat.user_id);
        if (existing) {
          existing.xp += stat.xp || 0;
          existing.level = Math.max(existing.level, stat.level || 1);
          existing.streak = Math.max(existing.streak, stat.streak || 0);
          existing.totalWords += stat.total_words || 0;
        } else {
          userStatsMap.set(stat.user_id, {
            xp: stat.xp || 0,
            level: stat.level || 1,
            streak: stat.streak || 0,
            totalWords: stat.total_words || 0,
          });
        }
      }

      // Get profiles for all users with stats
      const userIds = Array.from(userStatsMap.keys());
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Combine stats with profiles
      const leaderboard: LeaderboardEntry[] = [];
      
      for (const profile of profiles || []) {
        const stats = userStatsMap.get(profile.user_id);
        if (stats) {
          leaderboard.push({
            userId: profile.user_id,
            fullName: profile.full_name || 'Foydalanuvchi',
            avatarUrl: profile.avatar_url,
            xp: stats.xp,
            level: stats.level,
            streak: stats.streak,
            totalWords: stats.totalWords,
            rank: 0,
            isCurrentUser: profile.user_id === user.id,
          });
        }
      }

      // Sort by XP and assign ranks
      leaderboard.sort((a, b) => b.xp - a.xp);
      leaderboard.forEach((entry, index) => {
        entry.rank = index + 1;
        if (entry.isCurrentUser) {
          setMyRank(entry.rank);
        }
      });

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
