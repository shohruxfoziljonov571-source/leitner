import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { UserStats } from './types';
import { getDefaultStats, getLocalToday, getLocalYesterday } from './helpers';

export const useUserStats = (userId: string | undefined, languageId: string | undefined) => {
  const [stats, setStats] = useState<UserStats>(getDefaultStats());

  const fetchStats = useCallback(async () => {
    if (!userId || !languageId) {
      setStats(getDefaultStats());
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .eq('user_language_id', languageId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const today = getLocalToday();

        if (data.last_active_date !== today) {
          const yesterdayStr = getLocalYesterday();

          let newStreak = data.streak;
          if (data.last_active_date === yesterdayStr) {
            // Streak davom etadi FAQAT kecha haqiqatdan so'z takrorlangan bo'lsa
            // data.today_reviewed hali resetlanmagan — bu kechagi qiymat
            newStreak = data.today_reviewed > 0 ? data.streak + 1 : 0;
          } else {
            // Ikki yoki undan ko'p kun o'tgan — streak yo'qoldi
            newStreak = 0;
          }

          await supabase
            .from('user_stats')
            .update({
              today_reviewed: 0,
              today_correct: 0,
              streak: newStreak,
              last_active_date: today,
            })
            .eq('id', data.id);

          setStats({
            ...data,
            today_reviewed: 0,
            today_correct: 0,
            streak: newStreak,
            last_active_date: today,
          });
        } else {
          setStats(data);
        }
      } else {
        await supabase
          .from('user_stats')
          .insert({
            user_id: userId,
            user_language_id: languageId,
          });
        setStats(getDefaultStats());
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [userId, languageId]);

  // Visibility-change listener: refresh stats when user returns to tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && userId && languageId) {
        fetchStats();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [userId, languageId, fetchStats]);

  return { stats, setStats, fetchStats };
};
