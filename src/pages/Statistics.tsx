import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Target, TrendingUp, Flame, Award, Calendar } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWords } from '@/hooks/useWords';
import StatCard from '@/components/dashboard/StatCard';

const Statistics: React.FC = () => {
  const { t } = useLanguage();
  const { stats, getBoxCounts, words, isLoading } = useWords();
  const boxCounts = getBoxCounts();
  const totalWords = Object.values(boxCounts).reduce((a, b) => a + b, 0);

  // Calculate additional stats
  const totalReviews = words.reduce((acc, w) => acc + w.timesReviewed, 0);
  const totalCorrect = words.reduce((acc, w) => acc + w.timesCorrect, 0);
  const overallAccuracy = totalReviews > 0 ? Math.round((totalCorrect / totalReviews) * 100) : 0;
  const masteredWords = boxCounts[5];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse-soft text-muted-foreground">{t('loading')}</div>
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
          className="mb-8"
        >
          <h1 className="font-display font-bold text-3xl text-foreground mb-2">
            {t('statistics')} 📊
          </h1>
          <p className="text-muted-foreground">Sizning o'rganish natijalaringiz</p>
        </motion.div>

        {/* Main Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <StatCard
            icon={BookOpen}
            label={t('totalWords')}
            value={totalWords}
            delay={0.1}
          />
          <StatCard
            icon={Award}
            label="O'zlashtirilgan"
            value={masteredWords}
            subtext={`(${t('box')} 5)`}
            delay={0.15}
          />
          <StatCard
            icon={TrendingUp}
            label={t('accuracy')}
            value={`${overallAccuracy}%`}
            delay={0.2}
          />
          <StatCard
            icon={Target}
            label={t('reviewsToday')}
            value={stats.todayReviewed}
            delay={0.25}
          />
          <StatCard
            icon={Calendar}
            label="Jami takrorlar"
            value={totalReviews}
            delay={0.3}
          />
          <StatCard
            icon={Flame}
            label={t('streak')}
            value={stats.streak}
            subtext="kun"
            gradient
            delay={0.35}
          />
        </div>

        {/* Box Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
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

        {/* Today's Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-3xl p-6"
        >
          <h3 className="font-display font-semibold text-lg mb-4">
            Bugungi natija
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-card/50 rounded-2xl">
              <p className="font-display font-bold text-3xl text-primary">
                {stats.todayReviewed}
              </p>
              <p className="text-sm text-muted-foreground">takrorlangan</p>
            </div>
            <div className="text-center p-4 bg-card/50 rounded-2xl">
              <p className="font-display font-bold text-3xl text-primary">
                {stats.todayReviewed > 0
                  ? `${Math.round((stats.todayCorrect / stats.todayReviewed) * 100)}%`
                  : '—'}
              </p>
              <p className="text-sm text-muted-foreground">aniqlik</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Statistics;
