import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, PartyPopper, Plus, Layers, Gamepad2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLearningLanguage } from '@/contexts/LearningLanguageContext';
import { useWordsDB } from '@/hooks/useWordsDB';
import { useGamification } from '@/hooks/useGamification';
import { useWeeklyChallenge } from '@/hooks/useWeeklyChallenge';
import FlashCard from '@/components/learning/FlashCard';
import QuizCard from '@/components/learning/QuizCard';
import XpPopup from '@/components/gamification/XpPopup';
import XpBar from '@/components/gamification/XpBar';

// Fisher-Yates shuffle algorithm
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

type LearningMode = 'flashcard' | 'quiz';

const Learn: React.FC = () => {
  const { t } = useLanguage();
  const { activeLanguage } = useLearningLanguage();
  const { getWordsForReview, reviewWord, isLoading, stats, words } = useWordsDB();
  const { addXp, checkAndUnlockAchievements, XP_PER_CORRECT, XP_PER_INCORRECT, level } = useGamification();
  const { userParticipation, updateParticipantStats } = useWeeklyChallenge();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [showXpPopup, setShowXpPopup] = useState(false);
  const [lastXpGain, setLastXpGain] = useState(0);
  const [learningMode, setLearningMode] = useState<LearningMode | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get words for review - memoized based on words array content
  const wordsToReview = useMemo(() => {
    const now = new Date();
    return words.filter(word => new Date(word.next_review_time) <= now);
  }, [words]);

  // Shuffle words and assign random direction for each word (memoized once per session)
  const shuffledWordsWithDirection = useMemo(() => {
    const shuffled = shuffleArray(wordsToReview);
    return shuffled.map(word => ({
      word,
      isReversed: Math.random() < 0.5
    }));
  }, [wordsToReview]);

  // Filter out reviewed words
  const wordsForReview = useMemo(() => {
    return shuffledWordsWithDirection.filter(item => !reviewedIds.has(item.word.id));
  }, [shuffledWordsWithDirection, reviewedIds]);

  // All words for quiz options
  const allTransformedWords = useMemo(() => {
    return words.map(w => ({
      id: w.id,
      originalWord: w.original_word,
      translatedWord: w.translated_word,
      sourceLanguage: w.source_language as 'ru' | 'en',
      targetLanguage: w.target_language as 'uz' | 'ru' | 'en',
      exampleSentences: w.example_sentences || [],
      boxNumber: w.box_number as 1 | 2 | 3 | 4 | 5,
      nextReviewTime: new Date(w.next_review_time),
      timesReviewed: w.times_reviewed,
      timesCorrect: w.times_correct,
      timesIncorrect: w.times_incorrect,
      createdAt: new Date(w.created_at),
      lastReviewed: w.last_reviewed ? new Date(w.last_reviewed) : null,
    }));
  }, [words]);

  const currentWordItem = wordsForReview[0];
  const totalToReview = shuffledWordsWithDirection.length;
  const reviewedCount = reviewedIds.size;

  const handleAnswer = useCallback(async (isCorrect: boolean) => {
    if (currentWordItem) {
      await reviewWord(currentWordItem.word.id, isCorrect);
      setReviewedIds((prev) => new Set([...prev, currentWordItem.word.id]));
      setCurrentIndex((prev) => prev + 1);

      const xpGain = isCorrect ? XP_PER_CORRECT : XP_PER_INCORRECT;
      setLastXpGain(xpGain);
      setShowXpPopup(true);
      await addXp(xpGain, isCorrect ? 'correct_answer' : 'incorrect_answer');
      
      // Update weekly challenge stats if user is participating
      if (userParticipation) {
        await updateParticipantStats(xpGain, 1, isCorrect ? 1 : 0);
      }
      
      // Clear previous timeout to prevent memory leaks
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => setShowXpPopup(false), 1500);

      const totalReviews = words.reduce((acc, w) => acc + w.times_reviewed, 0) + 1;
      await checkAndUnlockAchievements({
        totalWords: words.length,
        streak: stats.streak,
        totalReviews,
        level,
      });
    }
  }, [currentWordItem, reviewWord, XP_PER_CORRECT, XP_PER_INCORRECT, addXp, words, checkAndUnlockAchievements, stats.streak, level, userParticipation, updateParticipantStats]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

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
          <p className="text-muted-foreground">Avval tilni tanlang</p>
          <Link to="/">
            <Button className="mt-4">Bosh sahifaga</Button>
          </Link>
        </div>
      </div>
    );
  }

  // No words to review
  if (totalToReview === 0) {
    return (
      <div className="min-h-screen pb-24 md:pt-24 md:pb-8">
        <div className="container mx-auto px-4 py-6 flex flex-col items-center justify-center min-h-[60vh]">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-muted flex items-center justify-center">
              <BookOpen className="w-12 h-12 text-muted-foreground" />
            </div>
            <h2 className="font-display font-bold text-2xl mb-2">{t('noWordsToReview')}</h2>
            <p className="text-muted-foreground mb-8 max-w-sm">
              Hozircha takrorlash uchun so'z yo'q. Yangi so'zlar qo'shing yoki keyinroq qaytib keling!
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
              {reviewedCount} so'z takrorlandi!
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
    return (
      <div className="min-h-screen pb-24 md:pt-24 md:pb-8">
        <div className="container mx-auto px-4 py-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="font-display font-bold text-2xl text-foreground mb-2">
              O'rganish rejimini tanlang
            </h1>
            <p className="text-muted-foreground">
              {totalToReview} ta so'z takrorlash uchun tayyor
            </p>
          </motion.div>

          <div className="grid gap-4 max-w-md mx-auto">
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              onClick={() => setLearningMode('flashcard')}
              className="p-6 rounded-3xl bg-card shadow-elevated hover:shadow-lg transition-all border-2 border-transparent hover:border-primary text-left group"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-2xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Layers className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Flashcard</h3>
                  <p className="text-sm text-muted-foreground">
                    So'zni ko'ring, javobni eslang va o'zingizni tekshiring
                  </p>
                </div>
              </div>
            </motion.button>

            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              onClick={() => setLearningMode('quiz')}
              className="p-6 rounded-3xl bg-card shadow-elevated hover:shadow-lg transition-all border-2 border-transparent hover:border-primary text-left group"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-2xl bg-accent/50 text-accent-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Gamepad2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Quiz (4 variant)</h3>
                  <p className="text-sm text-muted-foreground">
                    4 ta variantdan to'g'ri javobni tanlang - o'yin rejimi
                  </p>
                </div>
              </div>
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  // Transform word for FlashCard/QuizCard component
  const currentWord = currentWordItem?.word;
  const transformedWord = currentWord ? {
    id: currentWord.id,
    originalWord: currentWord.original_word,
    translatedWord: currentWord.translated_word,
    sourceLanguage: currentWord.source_language as 'ru' | 'en',
    targetLanguage: currentWord.target_language as 'uz' | 'ru' | 'en',
    exampleSentences: currentWord.example_sentences || [],
    boxNumber: currentWord.box_number as 1 | 2 | 3 | 4 | 5,
    nextReviewTime: new Date(currentWord.next_review_time),
    timesReviewed: currentWord.times_reviewed,
    timesCorrect: currentWord.times_correct,
    timesIncorrect: currentWord.times_incorrect,
    createdAt: new Date(currentWord.created_at),
    lastReviewed: currentWord.last_reviewed ? new Date(currentWord.last_reviewed) : null,
  } : null;

  return (
    <div className="min-h-screen pb-24 md:pt-24 md:pb-8">
      <XpPopup amount={lastXpGain} show={showXpPopup} />
      
      <div className="container mx-auto px-4 py-6">
        {/* Header with progress */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <h1 className="font-display font-bold text-2xl text-foreground">
                {t('learn')}
              </h1>
              <button
                onClick={() => setLearningMode(null)}
                className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
              >
                {learningMode === 'flashcard' ? '📚 Flashcard' : '🎮 Quiz'}
              </button>
            </div>
            <XpBar compact />
          </div>
          
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              {reviewedCount + 1} / {totalToReview} so'z
            </span>
            <span className="text-sm text-primary font-medium">
              +{XP_PER_CORRECT} XP to'g'ri javob uchun
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(reviewedCount / totalToReview) * 100}%` }}
              className="h-full gradient-primary rounded-full"
              transition={{ duration: 0.3 }}
            />
          </div>
        </motion.div>

        {/* Card based on mode */}
        <AnimatePresence mode="wait">
          {transformedWord && learningMode === 'flashcard' && (
            <FlashCard
              key={transformedWord.id}
              word={transformedWord}
              onAnswer={handleAnswer}
              isReversed={currentWordItem?.isReversed}
            />
          )}
          {transformedWord && learningMode === 'quiz' && (
            <QuizCard
              key={transformedWord.id}
              word={transformedWord}
              allWords={allTransformedWords}
              onAnswer={handleAnswer}
              isReversed={currentWordItem?.isReversed}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Learn;
