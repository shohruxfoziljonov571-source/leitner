import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'uz' | 'ru' | 'en';

interface Translations {
  [key: string]: {
    uz: string;
    ru: string;
    en: string;
  };
}

export const translations: Translations = {
  // Navigation
  dashboard: { uz: "Bosh sahifa", ru: "Главная", en: "Dashboard" },
  addWord: { uz: "So'z qo'shish", ru: "Добавить слово", en: "Add Word" },
  learn: { uz: "O'rganish", ru: "Учить", en: "Learn" },
  statistics: { uz: "Statistika", ru: "Статистика", en: "Statistics" },
  settings: { uz: "Sozlamalar", ru: "Настройки", en: "Settings" },
  
  // Dashboard
  welcomeMessage: { uz: "Xush kelibsiz!", ru: "Добро пожаловать!", en: "Welcome!" },
  todayProgress: { uz: "Bugungi natija", ru: "Сегодняшний прогресс", en: "Today's Progress" },
  totalWords: { uz: "Jami so'zlar", ru: "Всего слов", en: "Total Words" },
  learnedWords: { uz: "O'rganilgan", ru: "Изучено", en: "Learned" },
  streak: { uz: "Ketma-ket kunlar", en: "Day Streak", ru: "Серия дней" },
  startLearning: { uz: "O'rganishni boshlash", ru: "Начать учить", en: "Start Learning" },
  
  // Boxes
  box: { uz: "Quti", ru: "Коробка", en: "Box" },
  box1Desc: { uz: "Har soatda", ru: "Каждый час", en: "Every hour" },
  box2Desc: { uz: "Har 5 soatda", ru: "Каждые 5 часов", en: "Every 5 hours" },
  box3Desc: { uz: "Har kuni", ru: "Каждый день", en: "Every day" },
  box4Desc: { uz: "Har 5 kunda", ru: "Каждые 5 дней", en: "Every 5 days" },
  box5Desc: { uz: "Har oyda", ru: "Каждый месяц", en: "Every month" },
  words: { uz: "so'z", ru: "слов", en: "words" },
  
  // Add Word
  enterWord: { uz: "So'zni kiriting", ru: "Введите слово", en: "Enter word" },
  selectLanguage: { uz: "Tilni tanlang", ru: "Выберите язык", en: "Select language" },
  russian: { uz: "Ruscha", ru: "Русский", en: "Russian" },
  english: { uz: "Inglizcha", ru: "Английский", en: "English" },
  uzbek: { uz: "O'zbekcha", ru: "Узбекский", en: "Uzbek" },
  translation: { uz: "Tarjima", ru: "Перевод", en: "Translation" },
  examples: { uz: "Misollar", ru: "Примеры", en: "Examples" },
  add: { uz: "Qo'shish", ru: "Добавить", en: "Add" },
  cancel: { uz: "Bekor qilish", ru: "Отмена", en: "Cancel" },
  wordAdded: { uz: "So'z qo'shildi!", ru: "Слово добавлено!", en: "Word added!" },
  
  // Learning
  showAnswer: { uz: "Javobni ko'rsat", ru: "Показать ответ", en: "Show Answer" },
  correct: { uz: "To'g'ri", ru: "Правильно", en: "Correct" },
  incorrect: { uz: "Noto'g'ri", ru: "Неправильно", en: "Incorrect" },
  nextWord: { uz: "Keyingi so'z", ru: "Следующее слово", en: "Next Word" },
  noWordsToReview: { uz: "Takrorlash uchun so'z yo'q", ru: "Нет слов для повторения", en: "No words to review" },
  congratulations: { uz: "Tabriklaymiz!", ru: "Поздравляем!", en: "Congratulations!" },
  allDone: { uz: "Barcha so'zlar takrorlandi!", ru: "Все слова повторены!", en: "All words reviewed!" },
  
  // Stats
  wordsLearned: { uz: "O'rganilgan so'zlar", ru: "Изученные слова", en: "Words Learned" },
  accuracy: { uz: "Aniqlik", ru: "Точность", en: "Accuracy" },
  reviewsToday: { uz: "Bugungi takrorlar", ru: "Повторов сегодня", en: "Reviews Today" },
  
  // Settings
  interfaceLanguage: { uz: "Interfeys tili", ru: "Язык интерфейса", en: "Interface Language" },
  notifications: { uz: "Bildirishnomalar", ru: "Уведомления", en: "Notifications" },
  enabled: { uz: "Yoqilgan", ru: "Включено", en: "Enabled" },
  disabled: { uz: "O'chirilgan", ru: "Выключено", en: "Disabled" },
  
  // Common
  save: { uz: "Saqlash", ru: "Сохранить", en: "Save" },
  delete: { uz: "O'chirish", ru: "Удалить", en: "Delete" },
  edit: { uz: "Tahrirlash", ru: "Редактировать", en: "Edit" },
  back: { uz: "Orqaga", ru: "Назад", en: "Back" },
  loading: { uz: "Yuklanmoqda...", ru: "Загрузка...", en: "Loading..." },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('app-language');
    return (saved as Language) || 'uz';
  });

  useEffect(() => {
    localStorage.setItem('app-language', language);
  }, [language]);

  const t = (key: string): string => {
    if (translations[key]) {
      return translations[key][language];
    }
    return key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
