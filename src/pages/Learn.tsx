import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, PartyPopper, Plus, Layers, Gamepad2, Zap, PenLine, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLearningLanguage } from '@/contexts/LearningLanguageContext';
import { useLearnSession } from '@/hooks/useLearnSession';
import { useGamificationContext } from '@/contexts/GamificationContext';
import { useWeeklyChallenge } from '@/hooks/useWeeklyChallenge';
import { useNotificationQueue } from '@/components/notifications/NotificationQueue';
import { usePremium } from '@/contexts/PremiumContext';
import FlashCard from '@/components/learning/FlashCard';
import QuizCard from '@/components/learning/QuizCard';
import WritingCard from '@/components/learning/WritingCard';
import XpBar from '@/components/gamification/XpBar';
import PomodoroTimer from '@/components/learning/PomodoroTimer';
import SpeedModeTimer from '@/components/learning/SpeedModeTimer';
import UpgradePrompt from '@/components/premium/UpgradePrompt';
import { PremiumLock } from '@/components/premium/UpgradePrompt';
import { getLanguageFlag, getLanguageName } from '@/lib/languages';

// Fisher-Yates shuffle algorithm
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

type LearningMode = 'flashcard' | 'quiz' | 'speed' | 'writing';

const Learn: React.FC = () => {
  const { t, language } = useLanguage();
  const { activeLanguage } = useLearningLanguage();
  const { reviewWords: wordsToReview, allWords, reviewWord, isLoading, stats } = useLearnSession();
  const { addXp, checkAndUnlockAchievements, XP_PER_CORRECT, level } = useGamificationContext();
  const { userParticipation, updateParticipantStats } = useWeeklyChallenge();
  const { showStreak } = useNotificationQueue();
  const { isPremium, checkFeature } = usePremium();
  const [showUpgrade, setShowUpgrade] = useState(false);
  // Persist learning session in sessionStorage so progress survives tab switches / calls
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(() => {
    try {
      const saved = sessionStorage.getItem('learn_reviewed_ids');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });
  const [learningMode, setLearningMode] = useState<LearningMode | null>(() => {
    try {
      return (sessionStorage.getItem('learn_mode') as LearningMode | null) || null;
    } catch { return null; }
  });
  const [comboStreak, setComboStreak] = useState(0);
  const [speedResetTrigger, setSpeedResetTrigger] = useState(0);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const comboTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync reviewedIds to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem('learn_reviewed_ids', JSON.stringify([...reviewedIds]));
    } catch { /* ignore */ }
  }, [reviewedIds]);

  // Sync learningMode to sessionStorage
  useEffect(() => {
    try {
      if (learningMode) {
        sessionStorage.setItem('learn_mode', learningMode);
      } else {
        sessionStorage.removeItem('learn_mode');
        sessionStorage.removeItem('learn_reviewed_ids');
      }
    } catch { /* ignore */ }
  }, [learningMode]);

  // Shuffle words ONCE per session using a ref
  const shuffledWordsWithDirectionRef = useRef<Array<{ word: typeof wordsToReview[0]; isReversed: boolean }>>([]);
  const wordsToReviewIdsRef = useRef<string>('');

  const currentIdsKey = wordsToReview.map(w => w.id).sort().join(',');

  const prevIdsKey = wordsToReviewIdsRef.current;
  const idsChanged = prevIdsKey !== '' && prevIdsKey !== currentIdsKey;

  if (shuffledWordsWithDirectionRef.current.length === 0 || idsChanged) {
    const shuffled = shuffleArray(wordsToReview);
    shuffledWordsWithDirectionRef.current = shuffled.map(word => ({
      word,
      isReversed: Math.random() < 0.5,
    }));
    wordsToReviewIdsRef.current = currentIdsKey;
  }

  const shuffledWordsWithDirection = shuffledWordsWithDirectionRef.current;

  // Filter out reviewed words
  const wordsForReview = useMemo(() => {
    return shuffledWordsWithDirection.filter(item => !reviewedIds.has(item.word.id));
  }, [shuffledWordsWithDirection, reviewedIds]);

  const currentWordItem = wordsForReview[0];
  const totalToReview = shuffledWordsWithDirection.length;
  const reviewedCount = reviewedIds.size;

  const handleSpeedTimeout = useCallback(async () => {
    if (currentWordItem) {
      await reviewWord(currentWordItem.word.id, false);
      setReviewedIds((prev) => new Set([...prev, currentWordItem.word.id]));
      setCurrentIndex((prev) => prev + 1);
      setComboStreak(0);
      setSpeedResetTrigger(prev => prev + 1);
    }
  }, [currentWordItem, reviewWord]);

  const handleAnswer = useCallback(async (isCorrect: boolean) => {
    if (currentWordItem) {
      await reviewWord(currentWordItem.word.id, isCorrect);
      setReviewedIds((prev) => new Set([...prev, currentWordItem.word.id]));
      setCurrentIndex((prev) => prev + 1);

      const newStreak = isCorrect ? comboStreak + 1 : 0;
      setComboStreak(newStreak);
      
      if (isCorrect) {
        const comboBonus = newStreak >= 10 ? 5 : newStreak >= 5 ? 3 : newStreak >= 3 ? 1 : 0;
        const xpGain = XP_PER_CORRECT + comboBonus;
        
        const streakMilestones = [3, 5, 10, 15, 20];
        const isStreakMilestone = streakMilestones.includes(newStreak);
        
        if (isStreakMilestone) {
          showStreak(newStreak);
        }
        
        await addXp(xpGain, 'correct_answer');
      }
      
      if (userParticipation) {
        const xpForChallenge = isCorrect ? XP_PER_CORRECT : 0;
        await updateParticipantStats(xpForChallenge, 1, isCorrect ? 1 : 0);
      }

      const totalCorrect = allWords.reduce((acc, w) => acc + w.times_correct, 0) + (isCorrect ? 1 : 0);
      const totalReviews = allWords.reduce((acc, w) => acc + w.times_reviewed, 0) + 1;
      const accuracy = totalReviews > 0 ? Math.round((totalCorrect / totalReviews) * 100) : 0;
      await checkAndUnlockAchievements({
        totalWords: allWords.length,
        streak: stats.streak,
        totalReviews,
        accuracy,
        level,
      });

      if (learningMode === 'speed') {
        setSpeedResetTrigger(prev => prev + 1);
      }
    }
  }, [currentWordItem, reviewWord, XP_PER_CORRECT, addXp, allWords, checkAndUnlockAchievements, stats.streak, level, userParticipation, updateParticipantStats, comboStreak, learningMode, showStreak]);

  useEffect(() => {
    return () => {
      if (comboTimeoutRef.current) {
        clearTimeout(comboTimeoutRef.current);
      }
    };
  }, []);

  const handleModeSelect = (mode: LearningMode) => {
    // Flashcard is free, others need premium
    if (mode !== 'flashcard' && !checkFeature('hasQuizModes')) {
      setShowUpgrade(true);
      return;
    }
    setLearningMode(mode);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse-soft text-muted-foreground">{t('loading')}</div>
      </div>
    );
  }

  if (!activeLanguage) {
    return (
      <div className="min-h-screen pb-24 md:pt-24 md:pb-8">
        <div className="container mx-auto px-4 py-6 flex flex-col items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">{t('selectLanguageFirst')}</p>
          <Link to="/">
            <Button className="mt-4">{t('goToHome')}</Button>
          </Link>
        </div>
      </div>
    );
  }

  // No words to review
  if (totalToReview === 0) {
    const hasWords = allWords.length > 0;
    return (
      <div className="min-h-screen pb-24 md:pt-24 md:pb-8">
        <div className="container mx-auto px-4 py-6 flex flex-col items-center justify-center min-h-[60vh]">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-sm"
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-primary/10 flex items-center justify-center"
            >
              {hasWords ? (
                <span className="text-5xl">🎯</span>
              ) : (
                <BookOpen className="w-12 h-12 text-primary" />
              )}
            </motion.div>
            <h2 className="font-display font-bold text-2xl mb-2">
              {hasWords ? 'Hozircha takrorlanadigan so\'z yo\'q' : t('noWordsToReview')}
            </h2>
            <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
              {hasWords 
                ? `Siz ${allWords.length} ta so'zni qo'shgansiz. Ular belgilangan vaqtda takrorlash uchun tayyor bo'ladi. Hozircha yangi so'z qo'shing! 💪`
                : 'Birinchi so\'zingizni qo\'shing va o\'rganishni boshlang. Leitner tizimi sizga samarali yodlashni ta\'minlaydi.'
              }
            </p>
            <Link to="/add">
              <Button size="lg" className="gap-2 gradient-primary text-primary-foreground">
                <Plus className="w-5 h-5" />
                {t('addWord')}
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  // All reviewed
  if (wordsForReview.length === 0 && reviewedCount > 0) {
    return (
      <div className="min-h-screen pb-24 md:pt-24 md:pb-8">
        <div className="container mx-auto px-4 py-6 flex flex-col items-center justify-center min-h-[60vh]">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <motion.div
              initial={{ rotate: 0 }}
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="w-24 h-24 mx-auto mb-6 rounded-3xl gradient-primary flex items-center justify-center"
            >
              <PartyPopper className="w-12 h-12 text-primary-foreground" />
            </motion.div>
            <h2 className="font-display font-bold text-2xl mb-2">{t('congratulations')}</h2>
            <p className="text-muted-foreground mb-2">{t('allDone')}</p>
            <p className="text-lg font-medium text-primary mb-4">
              {t('wordsReviewed').replace('{count}', String(reviewedCount))}
            </p>
            <div className="mb-8">
              <XpBar />
            </div>
            <Link to="/">
              <Button size="lg" variant="outline" className="gap-2">
                {t('back')}
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  // Mode selection screen
  if (!learningMode) {
    const modes = [
      { mode: 'flashcard' as LearningMode, icon: Layers, title: 'Flashcard', desc: t('flashcardDesc'), iconClass: 'bg-primary/10 text-primary', premium: false },
      { mode: 'quiz' as LearningMode, icon: Gamepad2, title: 'Quiz (4 variant)', desc: t('quizDesc'), iconClass: 'bg-primary/10 text-primary', premium: true },
      { mode: 'speed' as LearningMode, icon: Zap, title: t('speedMode'), desc: t('speedDesc'), iconClass: 'bg-accent/10 text-accent', badge: '10s', premium: true },
      { mode: 'writing' as LearningMode, icon: PenLine, title: t('writingMode'), desc: t('writingDesc'), iconClass: 'bg-secondary/10 text-secondary', badge: t('newLabel'), premium: true },
    ];

    return (
      <div className="min-h-screen pb-24 md:pt-24 md:pb-8">
        <div className="container mx-auto px-4 py-5 max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <h1 className="font-display font-bold text-xl text-foreground mb-1">
              {t('selectMode')}
            </h1>
            <p className="text-xs text-muted-foreground">
              {getLanguageFlag(activeLanguage.source_language)} {getLanguageName(activeLanguage.source_language, language)} → {getLanguageFlag(activeLanguage.target_language)} {getLanguageName(activeLanguage.target_language, language)} • {totalToReview} {t('words')}
            </p>
          </motion.div>

          <div className="grid gap-2.5">
            {modes.map((item, index) => (
              <motion.button
                key={item.mode}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 + index * 0.08 }}
                onClick={() => handleModeSelect(item.mode)}
                className="p-3.5 rounded-xl bg-card shadow-card hover:shadow-elevated transition-all border border-border hover:border-primary/50 text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${item.iconClass} group-hover:bg-primary group-hover:text-primary-foreground transition-colors`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      {item.title}
                      {item.badge && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                          {item.badge}
                        </span>
                      )}
                      {item.premium && !isPremium && <PremiumLock />}
                    </h3>
                    <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        <UpgradePrompt
          open={showUpgrade}
          onOpenChange={setShowUpgrade}
          feature="Quiz rejimlari"
          description="Quiz, Tezlik rejimi va Yozma tekshirish faqat Premium foydalanuvchilari uchun. Flashcard bepul!"
        />
      </div>
    );
  }

  // Use word directly
  const currentWord = currentWordItem?.word ?? null;

  const getModeLabel = () => {
    switch (learningMode) {
      case 'flashcard': return '📚 Flashcard';
      case 'quiz': return '🎮 Quiz';
      case 'speed': return '⚡ Tezlik';
      case 'writing': return '✍️ Yozma';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen pb-24 md:pt-24 md:pb-8">
      
      {/* Break overlay */}
      <AnimatePresence>
        {isOnBreak && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-background/90 backdrop-blur-md"
          >
            <div className="text-center">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="text-6xl mb-4"
              >
                ☕
              </motion.div>
              <h2 className="font-display font-bold text-2xl mb-2">{t('breakTime')}</h2>
              <p className="text-muted-foreground">{t('breakDesc')}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="container mx-auto px-3 md:px-4 py-4 md:py-6 overflow-hidden">
        {/* Header with progress */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 md:mb-6"
        >
          {/* Row 1: Title + right controls */}
          <div className="flex items-center justify-between mb-3 gap-2">
            <button
              onClick={() => setLearningMode(null)}
              className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors whitespace-nowrap shrink-0"
            >
              {getModeLabel()}
            </button>

            <div className="flex items-center gap-2 shrink-0">
              {learningMode === 'speed' && (
                <SpeedModeTimer
                  isActive={!isOnBreak && !!currentWord}
                  onTimeout={handleSpeedTimeout}
                  timeLimit={10}
                  resetTrigger={speedResetTrigger}
                />
              )}
              <PomodoroTimer
                onBreakStart={() => setIsOnBreak(true)}
                onBreakEnd={() => setIsOnBreak(false)}
              />
              <XpBar compact />
            </div>
          </div>

          {/* Row 2: progress count + combo */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">
              {reviewedCount + 1} / {totalToReview} {t('words')}
            </span>
            {comboStreak >= 3 && (
              <motion.span
                key={comboStreak}
                initial={{ scale: 1.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-xs font-bold text-accent"
              >
                🔥 {comboStreak}x combo
              </motion.span>
            )}
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full gradient-primary"
              initial={{ width: 0 }}
              animate={{ width: `${totalToReview > 0 ? (reviewedCount / totalToReview) * 100 : 0}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </motion.div>

        {/* Card */}
        <AnimatePresence mode="wait">
          {currentWord && (
            <motion.div
              key={currentWord.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.2 }}
            >
              {learningMode === 'flashcard' && (
                <FlashCard
                  word={currentWord}
                  isReversed={currentWordItem?.isReversed ?? false}
                  onAnswer={handleAnswer}
                />
              )}
              {learningMode === 'quiz' && (
                <QuizCard
                  word={currentWord}
                  allWords={allWords}
                  isReversed={currentWordItem?.isReversed ?? false}
                  onAnswer={handleAnswer}
                />
              )}
              {learningMode === 'speed' && (
                <QuizCard
                  word={currentWord}
                  allWords={allWords}
                  isReversed={currentWordItem?.isReversed ?? false}
                  onAnswer={handleAnswer}
                />
              )}
              {learningMode === 'writing' && (
                <WritingCard
                  word={currentWord}
                  isReversed={currentWordItem?.isReversed ?? false}
                  onAnswer={handleAnswer}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Learn;
