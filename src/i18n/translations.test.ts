import { describe, it, expect } from 'vitest';
import { translations, type Language } from './translations';

describe('translations', () => {
  const languages: Language[] = ['uz', 'ru', 'en'];

  it('all keys have translations for all 3 languages', () => {
    for (const key of Object.keys(translations)) {
      for (const lang of languages) {
        expect(translations[key][lang], `Missing ${lang} for key "${key}"`).toBeDefined();
        expect(typeof translations[key][lang]).toBe('string');
        expect(translations[key][lang].length, `Empty ${lang} for key "${key}"`).toBeGreaterThan(0);
      }
    }
  });

  it('has required navigation keys', () => {
    const navKeys = ['dashboard', 'addWord', 'learn', 'statistics', 'friends', 'settings', 'dictation', 'books', 'profile'];
    for (const key of navKeys) {
      expect(translations[key], `Missing nav key "${key}"`).toBeDefined();
    }
  });

  it('has required common keys', () => {
    const commonKeys = ['save', 'delete', 'edit', 'back', 'loading', 'cancel'];
    for (const key of commonKeys) {
      expect(translations[key], `Missing common key "${key}"`).toBeDefined();
    }
  });

  it('placeholder {count} is present in parameterized strings', () => {
    const paramKeys = ['wordsWaiting', 'daysLeft', 'participants', 'achievementsUnlocked', 'wordsReviewed', 'wordsReadyForReview'];
    for (const key of paramKeys) {
      if (!translations[key]) continue;
      for (const lang of languages) {
        expect(translations[key][lang]).toContain('{count}');
      }
    }
  });
});
