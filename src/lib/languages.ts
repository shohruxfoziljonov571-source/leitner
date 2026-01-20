// Centralized language configuration
export const languageNames: Record<string, Record<string, string>> = {
  uz: { uz: "O'zbekcha", ru: 'Узбекский', en: 'Uzbek' },
  ru: { uz: 'Ruscha', ru: 'Русский', en: 'Russian' },
  en: { uz: 'Inglizcha', ru: 'Английский', en: 'English' },
  de: { uz: 'Nemischa', ru: 'Немецкий', en: 'German' },
  fr: { uz: 'Fransuzcha', ru: 'Французский', en: 'French' },
  es: { uz: 'Ispancha', ru: 'Испанский', en: 'Spanish' },
  ar: { uz: 'Arabcha', ru: 'Арабский', en: 'Arabic' },
  ko: { uz: 'Koreyscha', ru: 'Корейский', en: 'Korean' },
  ja: { uz: 'Yaponcha', ru: 'Японский', en: 'Japanese' },
  zh: { uz: 'Xitoycha', ru: 'Китайский', en: 'Chinese' },
  tr: { uz: 'Turkcha', ru: 'Турецкий', en: 'Turkish' },
  it: { uz: 'Italyancha', ru: 'Итальянский', en: 'Italian' },
  pt: { uz: 'Portugalcha', ru: 'Португальский', en: 'Portuguese' },
  hi: { uz: 'Hindcha', ru: 'Хинди', en: 'Hindi' },
  fa: { uz: 'Forscha', ru: 'Персидский', en: 'Persian' },
};

export const languageFlags: Record<string, string> = {
  uz: '🇺🇿',
  ru: '🇷🇺',
  en: '🇬🇧',
  de: '🇩🇪',
  fr: '🇫🇷',
  es: '🇪🇸',
  ar: '🇸🇦',
  ko: '🇰🇷',
  ja: '🇯🇵',
  zh: '🇨🇳',
  tr: '🇹🇷',
  it: '🇮🇹',
  pt: '🇵🇹',
  hi: '🇮🇳',
  fa: '🇮🇷',
};

export const allLanguages = Object.keys(languageNames);

export const getLanguageName = (code: string, uiLanguage: string = 'uz'): string => {
  return languageNames[code]?.[uiLanguage] || code.toUpperCase();
};

export const getLanguageFlag = (code: string): string => {
  return languageFlags[code] || '🌐';
};

export const getLanguagePairLabel = (
  sourceCode: string,
  targetCode: string,
  uiLanguage: string = 'uz'
): string => {
  return `${getLanguageFlag(sourceCode)} ${getLanguageName(sourceCode, uiLanguage)} → ${getLanguageFlag(targetCode)} ${getLanguageName(targetCode, uiLanguage)}`;
};
