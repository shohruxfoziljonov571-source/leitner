import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface DictationStats {
  totalDictations: number;
  averageAccuracy: number;
  totalXpEarned: number;
  recentSubmissions: {
    id: string;
    dictation_id: string;
    accuracy_percentage: number;
    created_at: string;
    dictation_title?: string;
  }[];
}

export const useDictationStats = () => {
  const [stats, setStats] = useState<DictationStats>({
    totalDictations: 0,
    averageAccuracy: 0,
    totalXpEarned: 0,
    recentSubmissions: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchStats = useCallback(async () => {
    if (!user) {
      setStats({
        totalDictations: 0,
        averageAccuracy: 0,
        totalXpEarned: 0,
        recentSubmissions: [],
      });
      setIsLoading(false);
      return;
    }

    try {
      const { data: submissions, error } = await supabase
        .from('dictation_submissions')
        .select(`
          id,
          dictation_id,
          accuracy_percentage,
          xp_earned,
          created_at,
          audio_dictations (
            title
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const totalDictations = submissions?.length || 0;
      const totalAccuracy = submissions?.reduce(
        (sum, s) => sum + (s.accuracy_percentage || 0),
        0
      ) || 0;
      const averageAccuracy = totalDictations > 0 
        ? Math.round(totalAccuracy / totalDictations) 
        : 0;
      const totalXpEarned = submissions?.reduce(
        (sum, s) => sum + (s.xp_earned || 0),
        0
      ) || 0;

      const recentSubmissions = (submissions || []).slice(0, 5).map((s) => ({
        id: s.id,
        dictation_id: s.dictation_id,
        accuracy_percentage: s.accuracy_percentage || 0,
        created_at: s.created_at,
        dictation_title: (s.audio_dictations as any)?.title || 'Diktant',
      }));

      setStats({
        totalDictations,
        averageAccuracy,
        totalXpEarned,
        recentSubmissions,
      });
    } catch (error) {
      console.error('Error fetching dictation stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, isLoading, refetch: fetchStats };
};
