import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Play, Trophy, Mic, Brain, Book, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLearningLanguage } from '@/contexts/LearningLanguageContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useGamificationContext } from '@/contexts/GamificationContext';
import CircularProgress from '@/components/dashboard/CircularProgress';
import LanguageSelector from '@/components/LanguageSelector';
import LanguageStats from '@/components/dashboard/LanguageStats';
import XpBar from '@/components/gamification/XpBar';
import WeeklyChallenge from '@/components/gamification/WeeklyChallenge';
import UnclaimedRewards from '@/components/gamification/UnclaimedRewards';

const Dashboard: React.FC = () => {
  const { t } = useLanguage();
  const { activeLanguage } = useLearningLanguage();
  const { stats, boxCounts, reviewCount, totalWords, isLoading } = useDashboardData();
  const { getUnlockedAchievements } = useGamificationContext();
  
  const unlockedAchievements = useMemo(() => getUnlockedAchievements(), [getUnlockedAchievements]);

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
              {t('selectLanguageFirst')}
            </p>
          </motion.div>
          <LanguageSelector />
        </div>
      </div>
    );
  }

  const dailyGoal = stats.daily_goal || 20;
  const dailyProgress = Math.min(stats.today_reviewed / dailyGoal, 1);
  const streakText = stats.streak === 0 ? '🌱' : `🔥 ${stats.streak}`;

  return (
    <div className="min-h-screen pb-24 md:pt-24 md:pb-8">
      <div className="container mx-auto px-4 py-5 max-w-lg">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div>
            <p className="text-sm text-muted-foreground">{t('welcomeMessage')}</p>
            <h1 className="font-display font-bold text-xl text-foreground">
              Leitner
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <XpBar compact />
            <div className="px-2.5 py-1.5 rounded-full bg-muted text-xs font-medium text-muted-foreground">
              {streakText}
            </div>
          </div>
        </motion.div>

        {/* Language Selector */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-6"
        >
          <LanguageSelector />
        </motion.div>

        {/* Daily Goal - Circular Progress */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl p-6 shadow-card mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-sm text-foreground">Kunlik maqsad</h2>
            <span className="text-xs text-muted-foreground">{Math.round(dailyProgress * 100)}%</span>
          </div>
          
          <div className="flex items-center justify-center">
            <CircularProgress value={stats.today_reviewed} max={dailyGoal} size={160} strokeWidth={10}>
              <div className="text-center">
                <span className="font-display font-bold text-3xl text-foreground">
                  {stats.today_reviewed}
                </span>
                <span className="text-muted-foreground text-lg">/{dailyGoal}</span>
                <p className="text-[10px] text-muted-foreground mt-0.5">so'z</p>
              </div>
            </CircularProgress>
          </div>

          {/* Start button */}
          {reviewCount > 0 && (
            <Link to="/learn" className="block mt-4">
              <Button size="lg" className="w-full gap-2 gradient-primary text-primary-foreground h-12 text-base rounded-xl">
                <Play className="w-5 h-5" />
                Boshlash
              </Button>
            </Link>
          )}

          {reviewCount > 0 && (
            <p className="text-xs text-center text-muted-foreground mt-2">
              {t('wordsWaiting').replace('{count}', String(reviewCount))}
            </p>
          )}
        </motion.div>

        {/* Language Statistics */}
        <LanguageStats />

        {/* Unclaimed Rewards */}
        <UnclaimedRewards />

        {/* Leitner System - Compact */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-semibold text-sm text-foreground">{t('leitnerBoxes')}</h2>
            <span className="text-xs text-muted-foreground">{totalWords} {t('words')}</span>
          </div>
          
          <div className="grid grid-cols-5 gap-2">
            {([1, 2, 3, 4, 5] as const).map((boxNumber) => (
              <motion.div
                key={boxNumber}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + boxNumber * 0.05 }}
                className="bg-card rounded-xl p-3 text-center shadow-card"
              >
                <div
                  className="text-[10px] font-medium mb-1 uppercase tracking-wider"
                  style={{ color: `hsl(var(--box-${boxNumber}))` }}
                >
                  Box {boxNumber}
                </div>
                <span className="font-display font-bold text-lg text-foreground">
                  {boxCounts[boxNumber]}
                </span>
                {/* Mini progress bar */}
                <div className="h-1 bg-muted rounded-full mt-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${totalWords > 0 ? (boxCounts[boxNumber] / totalWords) * 100 : 0}%`,
                      backgroundColor: `hsl(var(--box-${boxNumber}))`,
                    }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Quick Study */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <h2 className="font-display font-semibold text-sm text-foreground mb-3">Tez o'rganish</h2>
          <div className="grid grid-cols-3 gap-2">
            <Link to="/dictation">
              <div className="bg-card rounded-xl p-3 text-center shadow-card hover:shadow-elevated transition-shadow group">
                <div className="w-10 h-10 mx-auto mb-2 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: 'hsl(var(--feature-dictation) / 0.15)' }}>
                  <Mic className="w-5 h-5" style={{ color: 'hsl(var(--feature-dictation))' }} />
                </div>
                <p className="text-xs font-medium text-foreground">Diktant</p>
              </div>
            </Link>
            <Link to="/mnemonics">
              <div className="bg-card rounded-xl p-3 text-center shadow-card hover:shadow-elevated transition-shadow group">
                <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-accent/15 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-accent" />
                </div>
                <p className="text-xs font-medium text-foreground">Mnemonika</p>
              </div>
            </Link>
            <Link to="/books">
              <div className="bg-card rounded-xl p-3 text-center shadow-card hover:shadow-elevated transition-shadow group">
                <div className="w-10 h-10 mx-auto mb-2 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: 'hsl(var(--feature-books) / 0.15)' }}>
                  <Book className="w-5 h-5" style={{ color: 'hsl(var(--feature-books))' }} />
                </div>
                <p className="text-xs font-medium text-foreground">Kitoblar</p>
              </div>
            </Link>
          </div>
        </motion.div>

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
              <div className="bg-card rounded-xl p-4 shadow-card flex items-center justify-between hover:shadow-elevated transition-shadow">
                <div className="flex items-center gap-3">
                  <Trophy className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm text-foreground">{t('achievements')}</p>
                    <p className="text-xs text-muted-foreground">{t('achievementsUnlocked').replace('{count}', String(unlockedAchievements.length))}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <div className="flex -space-x-1.5">
                    {unlockedAchievements.slice(0, 4).map((a) => (
                      <div key={a.id} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-sm border-2 border-card">
                        {a.icon}
                      </div>
                    ))}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            </Link>
          </motion.div>
        )}

        {/* Empty State */}
        {totalWords === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-center py-10 px-6 rounded-2xl bg-card shadow-card"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl gradient-primary flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-primary-foreground" />
            </div>
            <h3 className="font-display font-semibold text-lg mb-2">
              {t('noWordsYet')}
            </h3>
            <p className="text-muted-foreground text-sm mb-5 max-w-sm mx-auto">
              {t('addFirstWordDesc')}
            </p>
            <Link to="/add">
              <Button size="lg" className="gap-2 gradient-primary text-primary-foreground">
                {t('addFirstWord')}
              </Button>
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
