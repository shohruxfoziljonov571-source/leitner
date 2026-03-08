import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLearningLanguage } from '@/contexts/LearningLanguageContext';
import { useGamificationContext } from '@/contexts/GamificationContext';

interface BoxCounts {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

const defaultBoxCounts: BoxCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

export const useDashboardData = () => {
  const { user } = useAuth();
  const { activeLanguage, isLoading: langLoading } = useLearningLanguage();
  const userId = user?.id;
  const languageId = activeLanguage?.id;

  const { stats, setStats, fetchStats } = useUserStats(userId, languageId);
  const [boxCounts, setBoxCounts] = useState<BoxCounts>(defaultBoxCounts);
  const [reviewCount, setReviewCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    if (!userId || !languageId) {
      setBoxCounts(defaultBoxCounts);
      setReviewCount(0);
      setStats(getDefaultStats());
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [boxResult, reviewResult] = await Promise.all([
        supabase.rpc('get_box_counts', { p_user_id: userId, p_language_id: languageId }),
        supabase.rpc('get_review_count', { p_user_id: userId, p_language_id: languageId }),
        fetchStats(),
      ]);

      if (boxResult.data) {
        const raw = boxResult.data as Record<string, number>;
        setBoxCounts({
          1: raw['1'] || 0,
          2: raw['2'] || 0,
          3: raw['3'] || 0,
          4: raw['4'] || 0,
          5: raw['5'] || 0,
        });
      }

      if (typeof reviewResult.data === 'number') {
        setReviewCount(reviewResult.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, languageId, fetchStats, setStats]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const totalWords = useMemo(
    () => Object.values(boxCounts).reduce((a, b) => a + b, 0),
    [boxCounts]
  );

  return {
    stats,
    boxCounts,
    reviewCount,
    totalWords,
    isLoading: isLoading || langLoading,
    refetch: fetchDashboardData,
  };
};
