import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Globe, BookOpen, Flame, TrendingUp, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLearningLanguage } from '@/contexts/LearningLanguageContext';
import { getLanguageFlag, getLanguageName } from '@/lib/languages';
import { Progress } from '@/components/ui/progress';

interface LanguageStat {
  id: string;
  source_language: string;
  target_language: string;
  total_words: number;
  learned_words: number;
  streak: number;
  xp: number;
  level: number;
}

const LanguageStats: React.FC = () => {
  const { user } = useAuth();
  const { userLanguages, activeLanguage, setActiveLanguage } = useLearningLanguage();
  const [languageStats, setLanguageStats] = useState<LanguageStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLanguageStats = async () => {
      if (!user || userLanguages.length === 0) {
        setIsLoading(false);
        return;
      }

      try {
        const languageIds = userLanguages.map(l => l.id);
        
        const { data: stats, error } = await supabase
          .from('user_stats')
          .select('user_language_id, total_words, learned_words, streak, xp, level')
          .in('user_language_id', languageIds);

        if (error) throw error;

        const combinedStats: LanguageStat[] = userLanguages.map(lang => {
          const stat = stats?.find(s => s.user_language_id === lang.id);
          return {
            id: lang.id,
            source_language: lang.source_language,
            target_language: lang.target_language,
            total_words: stat?.total_words || 0,
            learned_words: stat?.learned_words || 0,
            streak: stat?.streak || 0,
            xp: stat?.xp || 0,
            level: stat?.level || 1,
          };
        });

        setLanguageStats(combinedStats);
      } catch (error) {
        console.error('Error fetching language stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLanguageStats();
  }, [user, userLanguages]);

  if (isLoading || languageStats.length <= 1) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 }}
      className="mb-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <Globe className="w-5 h-5 text-primary" />
        <h2 className="font-display font-semibold text-lg text-foreground">
          Til statistikasi
        </h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {languageStats.map((stat, index) => {
          const isActive = activeLanguage?.id === stat.id;
          const progress = stat.total_words > 0 
            ? Math.round((stat.learned_words / stat.total_words) * 100) 
            : 0;
          
          return (
            <motion.div
              key={stat.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              onClick={() => {
                const lang = userLanguages.find(l => l.id === stat.id);
                if (lang) setActiveLanguage(lang);
              }}
              className={`relative p-4 rounded-2xl cursor-pointer transition-all duration-200 ${
                isActive 
                  ? 'bg-primary/10 border-2 border-primary shadow-lg' 
                  : 'bg-card border border-border hover:border-primary/50 hover:bg-card/80'
              }`}
            >
              {isActive && (
                <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full font-medium">
                  Faol
                </div>
              )}
              
              {/* Language Header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="text-2xl">
                  {getLanguageFlag(stat.source_language)}
                  <span className="mx-1 text-muted-foreground">→</span>
                  {getLanguageFlag(stat.target_language)}
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    {getLanguageName(stat.source_language)} → {getLanguageName(stat.target_language)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Level {stat.level} • {stat.xp} XP
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>O'zlashtirilgan</span>
                  <span>{stat.learned_words}/{stat.total_words} so'z ({progress}%)</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-background/50 rounded-lg p-2">
                  <BookOpen className="w-4 h-4 mx-auto text-primary mb-1" />
                  <p className="text-sm font-semibold text-foreground">{stat.total_words}</p>
                  <p className="text-xs text-muted-foreground">So'z</p>
                </div>
                <div className="bg-background/50 rounded-lg p-2">
                  <Flame className="w-4 h-4 mx-auto text-destructive mb-1" />
                  <p className="text-sm font-semibold text-foreground">{stat.streak}</p>
                  <p className="text-xs text-muted-foreground">Streak</p>
                </div>
                <div className="bg-background/50 rounded-lg p-2">
                  <Star className="w-4 h-4 mx-auto text-accent-foreground mb-1" />
                  <p className="text-sm font-semibold text-foreground">{stat.level}</p>
                  <p className="text-xs text-muted-foreground">Daraja</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default LanguageStats;
