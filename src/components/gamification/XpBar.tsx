import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { useGamificationContext } from '@/contexts/GamificationContext';

interface XpBarProps {
  compact?: boolean;
}

const XpBar: React.FC<XpBarProps> = memo(({ compact = false }) => {
  const { xp, level, getCurrentLevelXp, getXpForNextLevel } = useGamificationContext();
  
  const currentXp = getCurrentLevelXp();
  const xpNeeded = getXpForNextLevel();
  const progress = (currentXp / xpNeeded) * 100;

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 rounded-full">
        <Zap className="w-3 h-3 text-primary flex-shrink-0" />
        <span className="font-semibold text-[11px] text-primary">{level}</span>
        <div className="w-10 h-1 bg-muted rounded-full overflow-hidden">
          <motion.div
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="h-full bg-primary rounded-full"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl p-3.5 shadow-card">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <p className="font-display font-bold text-base">Daraja {level}</p>
            <p className="text-[11px] text-muted-foreground">{xp} XP jami</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-semibold text-sm text-primary">{currentXp}/{xpNeeded}</p>
          <p className="text-[10px] text-muted-foreground">keyingi daraja</p>
        </div>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="h-full gradient-primary rounded-full"
        />
      </div>
    </div>
  );
});

XpBar.displayName = 'XpBar';

export default XpBar;
