import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLearningLanguage } from '@/contexts/LearningLanguageContext';
import { toast } from 'sonner';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: number;
  type: 'words' | 'streak' | 'reviews' | 'accuracy' | 'level';
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_word', name: 'Birinchi qadam', description: 'Birinchi so\'zni qo\'shing', icon: '🌱', requirement: 1, type: 'words' },
  { id: 'word_10', name: 'O\'ntalik', description: '10 ta so\'z qo\'shing', icon: '📚', requirement: 10, type: 'words' },
  { id: 'word_50', name: 'Elliktalik', description: '50 ta so\'z qo\'shing', icon: '📖', requirement: 50, type: 'words' },
  { id: 'word_100', name: 'Yuztalik', description: '100 ta so\'z qo\'shing', icon: '🎓', requirement: 100, type: 'words' },
  { id: 'word_500', name: 'Lug\'at ustasi', description: '500 ta so\'z qo\'shing', icon: '🏆', requirement: 500, type: 'words' },
  { id: 'streak_3', name: 'Muntazam', description: '3 kunlik streak', icon: '🔥', requirement: 3, type: 'streak' },
  { id: 'streak_7', name: 'Haftalik', description: '7 kunlik streak', icon: '⚡', requirement: 7, type: 'streak' },
  { id: 'streak_30', name: 'Oylik', description: '30 kunlik streak', icon: '💎', requirement: 30, type: 'streak' },
  { id: 'reviews_100', name: 'Takrorlovchi', description: '100 ta takror', icon: '🔄', requirement: 100, type: 'reviews' },
  { id: 'reviews_500', name: 'Super takrorlovchi', description: '500 ta takror', icon: '🌟', requirement: 500, type: 'reviews' },
  { id: 'level_5', name: 'O\'rganuvchi', description: '5-darajaga yeting', icon: '⭐', requirement: 5, type: 'level' },
  { id: 'level_10', name: 'Professional', description: '10-darajaga yeting', icon: '🌙', requirement: 10, type: 'level' },
];

export const XP_PER_CORRECT = 10;
export const XP_PER_INCORRECT = 2;
export const XP_PER_NEW_WORD = 5;
export const XP_PER_LEVEL = 100;

export const calculateLevel = (xp: number): number => {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
};

export const getXpForNextLevel = (level: number): number => {
  return level * XP_PER_LEVEL;
};

export const getCurrentLevelXp = (xp: number): number => {
  return xp % XP_PER_LEVEL;
};

export const useGamification = () => {
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [achievements, setAchievements] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { activeLanguage } = useLearningLanguage();

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

  const addXp = useCallback(async (amount: number, reason?: string) => {
    if (!user || !activeLanguage) return;

    const newXp = xp + amount;
    const newLevel = calculateLevel(newXp);
    const leveledUp = newLevel > level;

    try {
      await supabase
        .from('user_stats')
        .update({ xp: newXp, level: newLevel })
        .eq('user_id', user.id)
        .eq('user_language_id', activeLanguage.id);

      setXp(newXp);
      setLevel(newLevel);

      // Update daily stats
      const today = new Date().toISOString().split('T')[0];
      await supabase
        .from('daily_stats')
        .upsert({
          user_id: user.id,
          user_language_id: activeLanguage.id,
          date: today,
          xp_earned: amount,
        }, {
          onConflict: 'user_id,user_language_id,date',
        });

      if (leveledUp) {
        toast.success(`🎉 Tabriklaymiz! ${newLevel}-darajaga yetdingiz!`, {
          duration: 4000,
        });
      }
    } catch (error) {
      console.error('Error adding XP:', error);
    }
  }, [user, activeLanguage, xp, level]);

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
          if (stats.totalWords && stats.totalWords >= achievement.requirement) {
            unlocked = true;
          }
          break;
        case 'streak':
          if (stats.streak && stats.streak >= achievement.requirement) {
            unlocked = true;
          }
          break;
        case 'reviews':
          if (stats.totalReviews && stats.totalReviews >= achievement.requirement) {
            unlocked = true;
          }
          break;
        case 'level':
          if (stats.level && stats.level >= achievement.requirement) {
            unlocked = true;
          }
          break;
      }

      if (unlocked) {
        newAchievements.push(achievement.id);
        toast.success(`🏆 Yangi yutuq: ${achievement.name}!`, {
          description: achievement.description,
          duration: 5000,
        });
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
    XP_PER_INCORRECT,
    XP_PER_NEW_WORD,
  };
};
