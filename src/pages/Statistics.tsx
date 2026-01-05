import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Target, TrendingUp, Flame, Award, Calendar, Zap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLearningLanguage } from '@/contexts/LearningLanguageContext';
import { useWordsDB } from '@/hooks/useWordsDB';
import { useGamification, ACHIEVEMENTS } from '@/hooks/useGamification';
import StatCard from '@/components/dashboard/StatCard';
import LanguageSelector from '@/components/LanguageSelector';
import XpBar from '@/components/gamification/XpBar';
import AchievementBadge from '@/components/gamification/AchievementBadge';
import WeeklyChart from '@/components/statistics/WeeklyChart';
import AccuracyChart from '@/components/statistics/AccuracyChart';

const Statistics: React.FC = () => {
  const { t } = useLanguage();
  const { activeLanguage, isLoading: langLoading } = useLearningLanguage();
  const { stats, getBoxCounts, words, isLoading } = useWordsDB();
  const { achievements, level, xp } = useGamification();
  const boxCounts = getBoxCounts();
  const totalWords = Object.values(boxCounts).reduce((a, b) => a + b, 0);

  // Calculate additional stats
  const totalReviews = words.reduce((acc, w) => acc + w.times_reviewed, 0);
  const totalCorrect = words.reduce((acc, w) => acc + w.times_correct, 0);
  const totalIncorrect = words.reduce((acc, w) => acc + w.times_incorrect, 0);
  const overallAccuracy = totalReviews > 0 ? Math.round((totalCorrect / totalReviews) * 100) : 0;
  const masteredWords = boxCounts[5];

  if (isLoading || langLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse-soft text-muted-foreground">{t('loading')}</div>
      </div>
    );
  }

  if (!activeLanguage) {
    return (
      <div className="min-h-screen pb-24 md:pt-24 md:pb-8">
        <div className="container mx-auto px-4 py-6 max-w-md">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 text-center"
          >
            <h1 className="font-display font-bold text-3xl text-foreground mb-2">
              {t('statistics')} 📊
            </h1>
            <p className="text-muted-foreground mb-6">
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
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="font-display font-bold text-3xl text-foreground mb-2">
            {t('statistics')} 📊
          </h1>
          <p className="text-muted-foreground">Sizning o'rganish natijalaringiz</p>
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
          <LanguageSelector showAddNew={false} />
        </motion.div>

        {/* Main Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <StatCard
            icon={BookOpen}
            label={t('totalWords')}
            value={totalWords}
            delay={0.15}
          />
          <StatCard
            icon={Award}
            label="O'zlashtirilgan"
            value={masteredWords}
            subtext={`(${t('box')} 5)`}
            delay={0.2}
          />
          <StatCard
            icon={TrendingUp}
            label={t('accuracy')}
            value={`${overallAccuracy}%`}
            delay={0.25}
          />
          <StatCard
            icon={Target}
            label={t('reviewsToday')}
            value={stats.today_reviewed}
            delay={0.3}
          />
          <StatCard
            icon={Calendar}
            label="Jami takrorlar"
            value={totalReviews}
            delay={0.35}
          />
          <StatCard
            icon={Flame}
            label={t('streak')}
            value={stats.streak}
            subtext="kun"
            gradient
            delay={0.4}
          />
        </div>

        {/* Charts Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <WeeklyChart />
          <AccuracyChart correct={totalCorrect} incorrect={totalIncorrect} />
        </div>

        {/* Box Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-card rounded-3xl shadow-card p-6 mb-8"
        >
          <h3 className="font-display font-semibold text-lg mb-6">
            Qutilar bo'yicha taqsimot
          </h3>
          
          <div className="space-y-4">
            {([1, 2, 3, 4, 5] as const).map((boxNum) => {
              const count = boxCounts[boxNum];
              const percentage = totalWords > 0 ? (count / totalWords) * 100 : 0;
              
              return (
                <div key={boxNum} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{t('box')} {boxNum}</span>
                    <span className="text-muted-foreground">{count} so'z</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.5, delay: 0.1 * boxNum }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: `hsl(var(--box-${boxNum}))` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Achievements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-card rounded-3xl shadow-card p-6 mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display font-semibold text-lg">
              Yutuqlar 🏆
            </h3>
            <span className="text-sm text-muted-foreground">
              {achievements.length}/{ACHIEVEMENTS.length} ochilgan
            </span>
          </div>
          
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {ACHIEVEMENTS.map((achievement, index) => (
              <AchievementBadge
                key={achievement.id}
                achievement={achievement}
                unlocked={achievements.includes(achievement.id)}
                delay={0.05 * index}
              />
            ))}
          </div>
        </motion.div>

        {/* Today's Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-3xl p-6"
        >
          <h3 className="font-display font-semibold text-lg mb-4">
            Bugungi natija
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-card/50 rounded-2xl">
              <p className="font-display font-bold text-3xl text-primary">
                {stats.today_reviewed}
              </p>
              <p className="text-sm text-muted-foreground">takrorlangan</p>
            </div>
            <div className="text-center p-4 bg-card/50 rounded-2xl">
              <p className="font-display font-bold text-3xl text-primary">
                {stats.today_reviewed > 0
                  ? `${Math.round((stats.today_correct / stats.today_reviewed) * 100)}%`
                  : '—'}
              </p>
              <p className="text-sm text-muted-foreground">aniqlik</p>
            </div>
            <div className="text-center p-4 bg-card/50 rounded-2xl">
              <p className="font-display font-bold text-3xl text-primary">
                {level}
              </p>
              <p className="text-sm text-muted-foreground">daraja</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Statistics;
