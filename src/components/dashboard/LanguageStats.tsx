import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLearningLanguage } from '@/contexts/LearningLanguageContext';
import { getLanguageFlag, getLanguageName } from '@/lib/languages';

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
      <div className="flex items-center gap-2 mb-3">
        <Globe className="w-4 h-4 text-primary" />
        <h2 className="font-display font-semibold text-sm text-foreground">
          Til statistikasi
        </h2>
      </div>
      
      <div className="grid grid-cols-1 gap-2">
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
              transition={{ delay: 0.05 * index }}
              onClick={() => {
                const lang = userLanguages.find(l => l.id === stat.id);
                if (lang) setActiveLanguage(lang);
              }}
              className={`p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                isActive 
                  ? 'bg-primary/10 border border-primary/30' 
                  : 'bg-card border border-border hover:border-primary/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="text-lg">
                    {getLanguageFlag(stat.source_language)}→{getLanguageFlag(stat.target_language)}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-foreground">
                      {getLanguageName(stat.source_language)} → {getLanguageName(stat.target_language)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Lv.{stat.level} • {stat.total_words} so'z • 🔥{stat.streak}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-primary">{stat.xp} XP</span>
                  {isActive && (
                    <p className="text-[10px] text-primary font-medium">Faol</p>
                  )}
                </div>
              </div>
              
              {/* Compact progress */}
              <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default LanguageStats;
