/**
 * GamificationContext — wraps useGamification logic so that
 * XpBar, Dashboard, Statistics, Learn all share ONE user_stats fetch
 * instead of each triggering their own DB query.
 */
import React, { createContext, useContext, ReactNode } from 'react';
import { useGamification } from '@/hooks/useGamification';
import type { Achievement } from '@/hooks/useGamification';

interface GamificationContextType {
  xp: number;
  level: number;
  achievements: string[];
  isLoading: boolean;
  addXp: (amount: number, reason?: string) => Promise<void>;
  checkAndUnlockAchievements: (stats: {
    totalWords?: number;
    streak?: number;
    totalReviews?: number;
    accuracy?: number;
    level?: number;
  }) => Promise<void>;
  getUnlockedAchievements: () => Achievement[];
  getLockedAchievements: () => Achievement[];
  getCurrentLevelXp: () => number;
  getXpForNextLevel: () => number;
  XP_PER_CORRECT: number;
}

const GamificationContext = createContext<GamificationContextType | null>(null);

export const GamificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const gamification = useGamification();

  return (
    <GamificationContext.Provider value={gamification}>
      {children}
    </GamificationContext.Provider>
  );
};

/**
 * useGamificationContext — consume the shared gamification state.
 * Falls back to calling useGamification() directly if used outside provider
 * (for backward compatibility during migration).
 */
export const useGamificationContext = (): GamificationContextType => {
  const ctx = useContext(GamificationContext);
  if (!ctx) {
    throw new Error('useGamificationContext must be used within GamificationProvider');
  }
  return ctx;
};
