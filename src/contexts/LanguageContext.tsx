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
  friends: { uz: "Do'stlar", ru: "Друзья", en: "Friends" },
  mnemonics: { uz: "Mnemonic", ru: "Мнемоника", en: "Mnemonics" },
  settings: { uz: "Sozlamalar", ru: "Настройки", en: "Settings" },
  dictation: { uz: "Diktant", ru: "Диктант", en: "Dictation" },
  books: { uz: "Kitoblar", ru: "Книги", en: "Books" },
  profile: { uz: "Profil", ru: "Профиль", en: "Profile" },
  
  // Dashboard
  welcomeMessage: { uz: "Xush kelibsiz!", ru: "Добро пожаловать!", en: "Welcome!" },
  todayProgress: { uz: "Bugungi natija", ru: "Сегодняшний прогресс", en: "Today's Progress" },
  totalWords: { uz: "Jami so'zlar", ru: "Всего слов", en: "Total Words" },
  learnedWords: { uz: "O'rganilgan", ru: "Изучено", en: "Learned" },
  streak: { uz: "Ketma-ket kunlar", en: "Day Streak", ru: "Серия дней" },
  startLearning: { uz: "O'rganishni boshlash", ru: "Начать учить", en: "Start Learning" },
  wordsWaiting: { uz: "{count} so'z takrorlashni kutmoqda", ru: "{count} слов ждут повторения", en: "{count} words waiting for review" },
  allReviewedToday: { uz: "Bugun uchun barcha so'zlar takrorlandi!", ru: "Все слова на сегодня повторены!", en: "All words reviewed for today!" },
  startToday: { uz: "Bugun boshlang!", ru: "Начните сегодня!", en: "Start today!" },
  days: { uz: "kun", ru: "дней", en: "days" },
  leitnerBoxes: { uz: "Leitner qutilar", ru: "Коробки Лейтнера", en: "Leitner Boxes" },
  noWordsYet: { uz: "So'zlar hali yo'q", ru: "Слов пока нет", en: "No words yet" },
  addFirstWordDesc: { uz: "Birinchi so'zingizni qo'shing va Leitner tizimi bilan o'rganishni boshlang!", ru: "Добавьте первое слово и начните учить по системе Лейтнера!", en: "Add your first word and start learning with the Leitner system!" },
  addFirstWord: { uz: "Birinchi so'z qo'shish", ru: "Добавить первое слово", en: "Add first word" },
  selectLanguageFirst: { uz: "Avval o'rganish tilini tanlang", ru: "Сначала выберите язык обучения", en: "Select a learning language first" },
  audioDictation: { uz: "Audio Diktant", ru: "Аудио диктант", en: "Audio Dictation" },
  listenAndWrite: { uz: "Tinglash va yozish", ru: "Слушать и писать", en: "Listen and write" },
  readAndLearn: { uz: "O'qish va o'rganish", ru: "Читать и учить", en: "Read and learn" },
  achievements: { uz: "Yutuqlar", ru: "Достижения", en: "Achievements" },
  achievementsUnlocked: { uz: "{count} ta yutuq ochilgan", ru: "{count} достижений открыто", en: "{count} achievements unlocked" },
  wordsReviewed: { uz: "{count} so'z takrorlandi!", ru: "{count} слов повторено!", en: "{count} words reviewed!" },
  
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
  selectMode: { uz: "O'rganish rejimini tanlang", ru: "Выберите режим обучения", en: "Select learning mode" },
  flashcardDesc: { uz: "So'zni ko'ring, javobni eslang va tekshiring", ru: "Посмотрите слово, вспомните ответ и проверьте", en: "See the word, recall the answer and check" },
  quizDesc: { uz: "4 ta variantdan to'g'ri javobni tanlang", ru: "Выберите правильный ответ из 4 вариантов", en: "Choose the correct answer from 4 options" },
  speedMode: { uz: "Tezlik rejimi", ru: "Режим скорости", en: "Speed Mode" },
  speedDesc: { uz: "10 soniya ichida javob bering!", ru: "Ответьте за 10 секунд!", en: "Answer within 10 seconds!" },
  writingMode: { uz: "Yozma tekshirish", ru: "Письменная проверка", en: "Writing Check" },
  writingDesc: { uz: "Klaviaturadan tarjimani yozing", ru: "Напишите перевод с клавиатуры", en: "Type the translation" },
  newLabel: { uz: "Yangi", ru: "Новое", en: "New" },
  wordsReadyForReview: { uz: "{count} ta so'z takrorlash uchun tayyor", ru: "{count} слов готовы к повторению", en: "{count} words ready for review" },
  noWordsAddMore: { uz: "Hozircha takrorlash uchun so'z yo'q. Yangi so'zlar qo'shing yoki keyinroq qaytib keling!", ru: "Пока нет слов для повторения. Добавьте новые слова или вернитесь позже!", en: "No words to review right now. Add new words or come back later!" },
  goToHome: { uz: "Bosh sahifaga", ru: "На главную", en: "Go to Home" },
  breakTime: { uz: "Dam olish vaqti", ru: "Время отдыха", en: "Break Time" },
  breakDesc: { uz: "5 daqiqa dam oling...", ru: "Отдохните 5 минут...", en: "Take a 5 minute break..." },
  swipeHint: { uz: "Chapga — noto'g'ri, O'ngga — to'g'ri", ru: "Влево — неверно, Вправо — верно", en: "Swipe left — wrong, right — correct" },
  
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
  
  // Weekly Challenge
  weeklyChallenge: { uz: "Haftalik Challenge", ru: "Еженедельный челлендж", en: "Weekly Challenge" },
  daysLeft: { uz: "{count} kun qoldi", ru: "Осталось {count} дней", en: "{count} days left" },
  participants: { uz: "{count} ishtirokchi", ru: "{count} участников", en: "{count} participants" },
  yourRank: { uz: "Sizning o'rningiz", ru: "Ваше место", en: "Your Rank" },
  joinChallenge: { uz: "Challenge'ga qo'shilish", ru: "Присоединиться к челленджу", en: "Join Challenge" },
  challengeJoined: { uz: "Challenge'ga qo'shildingiz!", ru: "Вы присоединились к челленджу!", en: "You joined the challenge!" },
  challengeInfo: { uz: "Bu hafta eng ko'p XP yig'ing va g'olib bo'ling!", ru: "Соберите больше XP на этой неделе и победите!", en: "Earn the most XP this week and win!" },
  
  // Rewards
  unclaimedRewards: { uz: "Olinmagan sovg'alar", ru: "Неполученные награды", en: "Unclaimed Rewards" },
  claimReward: { uz: "Olish", ru: "Получить", en: "Claim" },
  rank1: { uz: "1-o'rin", ru: "1-е место", en: "1st place" },
  rank2: { uz: "2-o'rin", ru: "2-е место", en: "2nd place" },
  rank3: { uz: "3-o'rin", ru: "3-е место", en: "3rd place" },
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
