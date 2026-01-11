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

      // Fetch stats and profiles in parallel
      const [statsResult, profilesResult] = await Promise.all([
        supabase
          .from('user_stats')
          .select('user_id, xp, level, streak, total_words'),
        supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
      ]);

      if (statsResult.error) throw statsResult.error;
      if (profilesResult.error) throw profilesResult.error;

      // Aggregate stats by user
      const userStatsMap = new Map<string, {
        xp: number;
        level: number;
        streak: number;
        totalWords: number;
      }>();

      for (const stat of statsResult.data || []) {
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

      // Create profile map
      const profileMap = new Map(
        (profilesResult.data || []).map(p => [p.user_id, p])
      );

      // Build leaderboard - only include users who have stats
      const leaderboard: LeaderboardEntry[] = [];
      
      for (const [userId, stats] of userStatsMap.entries()) {
        const profile = profileMap.get(userId);
        leaderboard.push({
          userId,
          fullName: profile?.full_name || 'Foydalanuvchi',
          avatarUrl: profile?.avatar_url || null,
          xp: stats.xp,
          level: stats.level,
          streak: stats.streak,
          totalWords: stats.totalWords,
          rank: 0,
          isCurrentUser: userId === user.id,
        });
      }

      // Sort by XP and assign ranks
      leaderboard.sort((a, b) => b.xp - a.xp);
      
      let foundMyRank = false;
      leaderboard.forEach((entry, index) => {
        entry.rank = index + 1;
        if (entry.isCurrentUser && !foundMyRank) {
          setMyRank(entry.rank);
          foundMyRank = true;
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
