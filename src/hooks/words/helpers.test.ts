import { describe, it, expect } from 'vitest';
import { getLocalToday, getLocalYesterday, getDefaultStats } from './helpers';

describe('helpers', () => {
  describe('getLocalToday', () => {
    it('returns YYYY-MM-DD format', () => {
      const today = getLocalToday();
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('matches current date', () => {
      const now = new Date();
      const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      expect(getLocalToday()).toBe(expected);
    });
  });

  describe('getLocalYesterday', () => {
    it('returns YYYY-MM-DD format', () => {
      const yesterday = getLocalYesterday();
      expect(yesterday).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('is one day before today', () => {
      const today = new Date(getLocalToday());
      const yesterday = new Date(getLocalYesterday());
      const diffMs = today.getTime() - yesterday.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      expect(diffDays).toBe(1);
    });
  });

  describe('getDefaultStats', () => {
    it('returns correct default values', () => {
      const stats = getDefaultStats();
      expect(stats.total_words).toBe(0);
      expect(stats.learned_words).toBe(0);
      expect(stats.streak).toBe(0);
      expect(stats.today_reviewed).toBe(0);
      expect(stats.today_correct).toBe(0);
      expect(stats.daily_goal).toBe(20);
      expect(stats.last_active_date).toBe(new Date().toISOString().split('T')[0]);
    });
  });
});

describe('streak logic', () => {
  // Simulates the streak calculation from useUserStats
  const calculateStreak = (
    lastActiveDate: string,
    todayReviewed: number,
    currentStreak: number,
    today: string,
    yesterday: string,
    dailyGoal: number = 10
  ): number => {
    if (lastActiveDate === today) return currentStreak; // Same day, no change
    
    if (lastActiveDate === yesterday) {
      // Streak davom etadi FAQAT kecha kunlik maqsad to'liq bajarilgan bo'lsa
      return todayReviewed >= dailyGoal ? currentStreak + 1 : 0;
    }
    
    // 2+ days missed
    return 0;
  };

  it('increments streak when daily goal was met yesterday', () => {
    const streak = calculateStreak('2026-02-24', 10, 3, '2026-02-25', '2026-02-24', 10);
    expect(streak).toBe(4); // 3 + 1
  });

  it('resets streak when daily goal was NOT met yesterday', () => {
    const streak = calculateStreak('2026-02-24', 5, 3, '2026-02-25', '2026-02-24', 10);
    expect(streak).toBe(0); // Goal not met
  });

  it('resets streak when user opened app but did NOT review yesterday', () => {
    const streak = calculateStreak('2026-02-24', 0, 3, '2026-02-25', '2026-02-24');
    expect(streak).toBe(0);
  });

  it('resets streak when 2+ days missed', () => {
    const streak = calculateStreak('2026-02-22', 10, 5, '2026-02-25', '2026-02-24');
    expect(streak).toBe(0);
  });

  it('returns same streak on same day', () => {
    const streak = calculateStreak('2026-02-25', 3, 7, '2026-02-25', '2026-02-24');
    expect(streak).toBe(7);
  });
});
