import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, PartyPopper, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWords } from '@/hooks/useWords';
import FlashCard from '@/components/learning/FlashCard';

const Learn: React.FC = () => {
  const { t } = useLanguage();
  const { getWordsForReview, reviewWord, isLoading } = useWords();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());

  const wordsForReview = useMemo(() => {
    return getWordsForReview().filter((w) => !reviewedIds.has(w.id));
  }, [getWordsForReview, reviewedIds]);

  const currentWord = wordsForReview[0];
  const totalToReview = getWordsForReview().length;
  const reviewedCount = reviewedIds.size;

  const handleAnswer = (isCorrect: boolean) => {
    if (currentWord) {
      reviewWord(currentWord.id, isCorrect);
      setReviewedIds((prev) => new Set([...prev, currentWord.id]));
      setCurrentIndex((prev) => prev + 1);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse-soft text-muted-foreground">{t('loading')}</div>
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
            <p className="text-lg font-medium text-primary mb-8">
              {reviewedCount} so'z takrorlandi!
            </p>
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

  return (
    <div className="min-h-screen pb-24 md:pt-24 md:pb-8">
      <div className="container mx-auto px-4 py-6">
        {/* Header with progress */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <h1 className="font-display font-bold text-2xl text-foreground">
              {t('learn')}
            </h1>
            <span className="text-muted-foreground font-medium">
              {reviewedCount + 1} / {totalToReview}
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
          {currentWord && (
            <FlashCard
              key={currentWord.id}
              word={currentWord}
              onAnswer={handleAnswer}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Learn;
