import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, PartyPopper, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLearningLanguage } from '@/contexts/LearningLanguageContext';
import { useWordsDB } from '@/hooks/useWordsDB';
import { useGamification } from '@/hooks/useGamification';
import FlashCard from '@/components/learning/FlashCard';
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

const Learn: React.FC = () => {
  const { t } = useLanguage();
  const { activeLanguage } = useLearningLanguage();
  const { getWordsForReview, reviewWord, isLoading, stats, words } = useWordsDB();
  const { addXp, checkAndUnlockAchievements, XP_PER_CORRECT, XP_PER_INCORRECT, level } = useGamification();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [showXpPopup, setShowXpPopup] = useState(false);
  const [lastXpGain, setLastXpGain] = useState(0);

  // Shuffle words and assign random direction for each word (memoized once per session)
  const shuffledWordsWithDirection = useMemo(() => {
    const wordsToReview = getWordsForReview();
    const shuffled = shuffleArray(wordsToReview);
    // Randomly assign direction for each word (50% chance to be reversed)
    return shuffled.map(word => ({
      word,
      isReversed: Math.random() < 0.5
    }));
  }, [words]); // Re-shuffle when words list changes

  // Filter out reviewed words
  const wordsForReview = useMemo(() => {
    return shuffledWordsWithDirection.filter(item => !reviewedIds.has(item.word.id));
  }, [shuffledWordsWithDirection, reviewedIds]);

  const currentWordItem = wordsForReview[0];
  const totalToReview = shuffledWordsWithDirection.length;
  const reviewedCount = reviewedIds.size;

  const handleAnswer = async (isCorrect: boolean) => {
    if (currentWordItem) {
      await reviewWord(currentWordItem.word.id, isCorrect);
      setReviewedIds((prev) => new Set([...prev, currentWordItem.word.id]));
      setCurrentIndex((prev) => prev + 1);

      // Add XP
      const xpGain = isCorrect ? XP_PER_CORRECT : XP_PER_INCORRECT;
      setLastXpGain(xpGain);
      setShowXpPopup(true);
      await addXp(xpGain, isCorrect ? 'correct_answer' : 'incorrect_answer');
      
      setTimeout(() => setShowXpPopup(false), 1500);

      // Check achievements
      const totalReviews = words.reduce((acc, w) => acc + w.times_reviewed, 0) + 1;
      await checkAndUnlockAchievements({
        totalWords: words.length,
        streak: stats.streak,
        totalReviews,
        level,
      });
    }
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

  // Transform word for FlashCard component
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
            <h1 className="font-display font-bold text-2xl text-foreground">
              {t('learn')}
            </h1>
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

        {/* Flash Card */}
        <AnimatePresence mode="wait">
          {transformedWord && (
            <FlashCard
              key={transformedWord.id}
              word={transformedWord}
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
