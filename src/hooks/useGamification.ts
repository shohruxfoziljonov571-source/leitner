import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLearningLanguage } from '@/contexts/LearningLanguageContext';
import { notificationEmitter } from '@/components/notifications/NotificationQueue';
import { getLocalToday } from '@/hooks/words/helpers';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: number;
  type: 'words' | 'streak' | 'reviews' | 'accuracy' | 'level';
}

export const ACHIEVEMENTS: Achievement[] = [
  // So'z yutuqlari
  { id: 'first_word', name: 'Birinchi qadam', description: 'Birinchi so\'zni qo\'shing', icon: '🌱', requirement: 1, type: 'words' },
  { id: 'word_10', name: 'O\'ntalik', description: '10 ta so\'z qo\'shing', icon: '📚', requirement: 10, type: 'words' },
  { id: 'word_50', name: 'Elliktalik', description: '50 ta so\'z qo\'shing', icon: '📖', requirement: 50, type: 'words' },
  { id: 'word_100', name: 'Yuztalik', description: '100 ta so\'z qo\'shing', icon: '🎓', requirement: 100, type: 'words' },
  { id: 'word_250', name: 'Lug\'at bilimdon', description: '250 ta so\'z qo\'shing', icon: '📕', requirement: 250, type: 'words' },
  { id: 'word_500', name: 'Lug\'at ustasi', description: '500 ta so\'z qo\'shing', icon: '🏆', requirement: 500, type: 'words' },
  { id: 'word_1000', name: 'Poliglot', description: '1000 ta so\'z qo\'shing', icon: '👑', requirement: 1000, type: 'words' },
  { id: 'word_2000', name: 'Leksikograf', description: '2000 ta so\'z qo\'shing', icon: '🌍', requirement: 2000, type: 'words' },
  
  // Streak yutuqlari
  { id: 'streak_3', name: 'Muntazam', description: '3 kunlik streak', icon: '🔥', requirement: 3, type: 'streak' },
  { id: 'streak_7', name: 'Haftalik', description: '7 kunlik streak', icon: '⚡', requirement: 7, type: 'streak' },
  { id: 'streak_14', name: 'Ikki haftalik', description: '14 kunlik streak', icon: '💫', requirement: 14, type: 'streak' },
  { id: 'streak_30', name: 'Oylik', description: '30 kunlik streak', icon: '💎', requirement: 30, type: 'streak' },
  { id: 'streak_60', name: 'Ikki oylik', description: '60 kunlik streak', icon: '🌈', requirement: 60, type: 'streak' },
  { id: 'streak_100', name: 'Yuz kunlik', description: '100 kunlik streak', icon: '🏅', requirement: 100, type: 'streak' },
  { id: 'streak_365', name: 'Yillik chempion', description: '365 kunlik streak', icon: '🏆', requirement: 365, type: 'streak' },
  
  // Takror yutuqlari
  { id: 'reviews_50', name: 'Boshlovchi takrorlovchi', description: '50 ta takror', icon: '🔁', requirement: 50, type: 'reviews' },
  { id: 'reviews_100', name: 'Takrorlovchi', description: '100 ta takror', icon: '🔄', requirement: 100, type: 'reviews' },
  { id: 'reviews_250', name: 'Faol takrorlovchi', description: '250 ta takror', icon: '⭐', requirement: 250, type: 'reviews' },
  { id: 'reviews_500', name: 'Super takrorlovchi', description: '500 ta takror', icon: '🌟', requirement: 500, type: 'reviews' },
  { id: 'reviews_1000', name: 'Mega takrorlovchi', description: '1000 ta takror', icon: '💥', requirement: 1000, type: 'reviews' },
  { id: 'reviews_2500', name: 'Ultra takrorlovchi', description: '2500 ta takror', icon: '🚀', requirement: 2500, type: 'reviews' },
  { id: 'reviews_5000', name: 'Takror qiroli', description: '5000 ta takror', icon: '👑', requirement: 5000, type: 'reviews' },
  
  // Aniqlik yutuqlari
  { id: 'accuracy_80', name: 'Aniq', description: '80% aniqlikka erishing (min 100 ta takror)', icon: '🎯', requirement: 80, type: 'accuracy' },
  { id: 'accuracy_90', name: 'Juda aniq', description: '90% aniqlikka erishing (min 100 ta takror)', icon: '🏹', requirement: 90, type: 'accuracy' },
  { id: 'accuracy_95', name: 'Mukammal', description: '95% aniqlikka erishing (min 200 ta takror)', icon: '💯', requirement: 95, type: 'accuracy' },
  
  // Daraja yutuqlari
  { id: 'level_5', name: 'O\'rganuvchi', description: '5-darajaga yeting', icon: '⭐', requirement: 5, type: 'level' },
  { id: 'level_10', name: 'Tajribali', description: '10-darajaga yeting', icon: '🌙', requirement: 10, type: 'level' },
  { id: 'level_20', name: 'Professional', description: '20-darajaga yeting', icon: '🌟', requirement: 20, type: 'level' },
  { id: 'level_30', name: 'Ekspert', description: '30-darajaga yeting', icon: '💫', requirement: 30, type: 'level' },
  { id: 'level_50', name: 'Usta', description: '50-darajaga yeting', icon: '🏆', requirement: 50, type: 'level' },
  { id: 'level_100', name: 'Grandmaster', description: '100-darajaga yeting', icon: '👑', requirement: 100, type: 'level' },
];

export const XP_PER_CORRECT = 10;

// Progressive level system: each level requires level * 150 XP
export const getTotalXpForLevel = (level: number): number => {
  return 75 * level * (level - 1);
};

export const calculateLevel = (xp: number): number => {
  return Math.floor((75 + Math.sqrt(5625 + 300 * xp)) / 150);
};

export const getXpForNextLevel = (level: number): number => {
  return level * 150;
};

export const getCurrentLevelXp = (xp: number): number => {
  const level = calculateLevel(xp);
  return xp - getTotalXpForLevel(level);
};

export const useGamification = () => {
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [achievements, setAchievements] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { activeLanguage } = useLearningLanguage();

  // Ref to track level for level-up detection without stale closures
  const levelRef = useRef(1);
  useEffect(() => { levelRef.current = level; }, [level]);

  const fetchGamificationData = useCallback(async () => {
    if (!user || !activeLanguage) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_stats')
        .select('xp, level, achievements')
        .eq('user_id', user.id)
        .eq('user_language_id', activeLanguage.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setXp(data.xp || 0);
        setLevel(data.level || 1);
        setAchievements(data.achievements || []);
      }
    } catch (error) {
      console.error('Error fetching gamification data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, activeLanguage]);

  useEffect(() => {
    fetchGamificationData();
  }, [fetchGamificationData]);

  /**
   * Atomic XP increment via server-side RPC.
   * Prevents race conditions when multiple addXp calls happen rapidly.
   */
  const addXp = useCallback(async (amount: number, reason?: string) => {
    if (!user || !activeLanguage) return;

    try {
      const today = getLocalToday();

      const [xpResult] = await Promise.all([
        supabase.rpc('increment_user_xp' as any, {
          p_user_id: user.id,
          p_language_id: activeLanguage.id,
          p_amount: amount,
        }),
        supabase.rpc('increment_daily_xp', {
          p_user_id: user.id,
          p_language_id: activeLanguage.id,
          p_date: today,
          p_xp: amount,
        }),
      ]);

      if (xpResult.data) {
        const result = xpResult.data as { new_xp: number; new_level: number };
        setXp(result.new_xp);
        setLevel(result.new_level);

        if (result.new_level > levelRef.current) {
          notificationEmitter.showLevelUp(result.new_level);
        }
      }
    } catch (error) {
      console.error('Error adding XP:', error);
    }
  }, [user, activeLanguage]);

  const checkAndUnlockAchievements = useCallback(async (stats: {
    totalWords?: number;
    streak?: number;
    totalReviews?: number;
    accuracy?: number;
    level?: number;
  }) => {
    if (!user || !activeLanguage) return;

    const newAchievements: string[] = [];

    for (const achievement of ACHIEVEMENTS) {
      if (achievements.includes(achievement.id)) continue;

      let unlocked = false;

      switch (achievement.type) {
        case 'words':
          if (stats.totalWords && stats.totalWords >= achievement.requirement) unlocked = true;
          break;
        case 'streak':
          if (stats.streak && stats.streak >= achievement.requirement) unlocked = true;
          break;
        case 'reviews':
          if (stats.totalReviews && stats.totalReviews >= achievement.requirement) unlocked = true;
          break;
        case 'accuracy':
          if (stats.accuracy !== undefined && stats.totalReviews !== undefined) {
            const minReviews = achievement.requirement >= 95 ? 200 : 100;
            if (stats.totalReviews >= minReviews && stats.accuracy >= achievement.requirement) unlocked = true;
          }
          break;
        case 'level':
          if (stats.level && stats.level >= achievement.requirement) unlocked = true;
          break;
      }

      if (unlocked) {
        newAchievements.push(achievement.id);
        notificationEmitter.showAchievement(achievement.name, achievement.description, achievement.icon);
      }
    }

    if (newAchievements.length > 0) {
      const allAchievements = [...achievements, ...newAchievements];
      
      try {
        await supabase
          .from('user_stats')
          .update({ achievements: allAchievements })
          .eq('user_id', user.id)
          .eq('user_language_id', activeLanguage.id);

        setAchievements(allAchievements);
      } catch (error) {
        console.error('Error updating achievements:', error);
      }
    }
  }, [user, activeLanguage, achievements]);

  const getUnlockedAchievements = useCallback(() => {
    return ACHIEVEMENTS.filter(a => achievements.includes(a.id));
  }, [achievements]);

  const getLockedAchievements = useCallback(() => {
    return ACHIEVEMENTS.filter(a => !achievements.includes(a.id));
  }, [achievements]);

  return {
    xp,
    level,
    achievements,
    isLoading,
    addXp,
    checkAndUnlockAchievements,
    getUnlockedAchievements,
    getLockedAchievements,
    getCurrentLevelXp: () => getCurrentLevelXp(xp),
    getXpForNextLevel: () => getXpForNextLevel(level),
    XP_PER_CORRECT,
  };
};
