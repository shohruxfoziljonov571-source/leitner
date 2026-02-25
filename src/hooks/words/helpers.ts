import type { UserStats } from './types';

export const getDefaultStats = (): UserStats => ({
  total_words: 0,
  learned_words: 0,
  streak: 0,
  today_reviewed: 0,
  today_correct: 0,
  last_active_date: new Date().toISOString().split('T')[0],
  daily_goal: 20,
});

export const getLocalToday = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export const getLocalYesterday = (): string => {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
};
