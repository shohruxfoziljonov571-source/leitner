import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Flame, Target, TrendingUp, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLearningLanguage } from '@/contexts/LearningLanguageContext';
import { useWordsDB } from '@/hooks/useWordsDB';
import { useGamification } from '@/hooks/useGamification';
import BoxCard from '@/components/dashboard/BoxCard';
import StatCard from '@/components/dashboard/StatCard';
import LanguageSelector from '@/components/LanguageSelector';
import XpBar from '@/components/gamification/XpBar';
import WeeklyChallenge from '@/components/gamification/WeeklyChallenge';

const Dashboard: React.FC = () => {
  const { t } = useLanguage();
  const { activeLanguage, isLoading: langLoading } = useLearningLanguage();
  const { stats, getBoxCounts, getWordsForReview, isLoading } = useWordsDB();
  const { level, getUnlockedAchievements } = useGamification();
  
  // Memoize expensive calculations
  const boxCounts = useMemo(() => getBoxCounts(), [getBoxCounts]);
  const wordsForReview = useMemo(() => getWordsForReview(), [getWordsForReview]);
  const totalWords = useMemo(() => Object.values(boxCounts).reduce((a, b) => a + b, 0), [boxCounts]);
  const unlockedAchievements = useMemo(() => getUnlockedAchievements(), [getUnlockedAchievements]);
  
  const accuracy = useMemo(() => {
    if (stats.today_reviewed > 0) {
      return `${Math.round((stats.today_correct / stats.today_reviewed) * 100)}%`;
    }
    return '—';
  }, [stats.today_correct, stats.today_reviewed]);

  if (isLoading || langLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse-soft text-muted-foreground">{t('loading')}</div>
      </div>
    );
  }

  // Show language selector if no active language
  if (!activeLanguage) {
    return (
      <div className="min-h-screen pb-24 md:pt-24 md:pb-8">
        <div className="container mx-auto px-4 py-6 max-w-md">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 text-center"
          >
            <h1 className="font-display font-bold text-3xl md:text-4xl text-foreground mb-2">
              {t('welcomeMessage')} 👋
            </h1>
            <p className="text-muted-foreground">
              Avval o'rganish tilini tanlang
            </p>
          </motion.div>
          <LanguageSelector />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 md:pt-24 md:pb-8">
      <div className="container mx-auto px-4 py-6">
        {/* Header with Level */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-start justify-between"
        >
          <div>
            <h1 className="font-display font-bold text-3xl md:text-4xl text-foreground mb-2">
              {t('welcomeMessage')} 👋
            </h1>
            <p className="text-muted-foreground">
              {wordsForReview.length > 0
                ? `${wordsForReview.length} so'z takrorlashni kutmoqda`
                : "Bugun uchun barcha so'zlar takrorlandi!"}
            </p>
          </div>
          <XpBar compact />
        </motion.div>

        {/* XP Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-6"
        >
          <XpBar />
        </motion.div>

        {/* Language Selector */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <LanguageSelector />
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={BookOpen}
            label={t('totalWords')}
            value={totalWords}
            delay={0.15}
          />
          <StatCard
            icon={Target}
            label={t('todayProgress')}
            value={stats.today_reviewed}
            subtext={t('words')}
            delay={0.2}
          />
          <StatCard
            icon={TrendingUp}
            label={t('accuracy')}
            value={accuracy}
            delay={0.25}
          />
          <StatCard
            icon={Flame}
            label={t('streak')}
            value={stats.streak}
            subtext="kun"
            gradient
            delay={0.3}
          />
        </div>

        {/* Weekly Challenge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mb-6"
        >
          <WeeklyChallenge />
        </motion.div>

        {/* Achievements Preview */}
        {unlockedAchievements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-6"
          >
            <Link to="/stats" className="block">
              <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl p-4 flex items-center justify-between hover:from-primary/20 hover:to-secondary/20 transition-colors">
                <div className="flex items-center gap-3">
                  <Trophy className="w-6 h-6 text-primary" />
                  <div>
                    <p className="font-semibold text-foreground">Yutuqlar</p>
                    <p className="text-sm text-muted-foreground">{unlockedAchievements.length} ta yutuq ochilgan</p>
                  </div>
                </div>
                <div className="flex -space-x-2">
                  {unlockedAchievements.slice(0, 5).map((a) => (
                    <div key={a.id} className="w-8 h-8 rounded-full bg-card flex items-center justify-center text-lg shadow-sm">
                      {a.icon}
                    </div>
                  ))}
                </div>
              </div>
            </Link>
          </motion.div>
        )}

        {/* Start Learning Button */}
        {wordsForReview.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="mb-8"
          >
            <Link to="/learn">
              <Button size="lg" className="w-full md:w-auto gap-2 gradient-primary text-primary-foreground h-14 text-lg shadow-elevated">
                <BookOpen className="w-5 h-5" />
                {t('startLearning')} ({wordsForReview.length} so'z)
              </Button>
            </Link>
          </motion.div>
        )}

        {/* Leitner Boxes */}
        <div className="mb-6">
          <h2 className="font-display font-semibold text-xl text-foreground mb-4">
            Leitner qutilar
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {([1, 2, 3, 4, 5] as const).map((boxNumber, index) => (
              <BoxCard
                key={boxNumber}
                boxNumber={boxNumber}
                wordCount={boxCounts[boxNumber]}
                totalWords={totalWords}
                delay={0.1 * index}
              />
            ))}
          </div>
        </div>

        {/* Empty State */}
        {totalWords === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-center py-12 px-6 rounded-3xl bg-card shadow-card"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl gradient-primary flex items-center justify-center">
              <BookOpen className="w-10 h-10 text-primary-foreground" />
            </div>
            <h3 className="font-display font-semibold text-xl mb-2">
              So'zlar hali yo'q
            </h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Birinchi so'zingizni qo'shing va Leitner tizimi bilan o'rganishni boshlang!
            </p>
            <Link to="/add">
              <Button size="lg" className="gap-2 gradient-primary text-primary-foreground">
                Birinchi so'z qo'shish
              </Button>
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
