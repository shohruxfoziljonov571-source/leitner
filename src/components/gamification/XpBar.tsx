import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useGamification } from '@/hooks/useGamification';

interface XpBarProps {
  compact?: boolean;
}

const XpBar: React.FC<XpBarProps> = memo(({ compact = false }) => {
  const { xp, level, getCurrentLevelXp, getXpForNextLevel } = useGamification();
  
  const currentXp = getCurrentLevelXp();
  const xpNeeded = getXpForNextLevel();
  const progress = (currentXp / xpNeeded) * 100;

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full"
      >
        <Zap className="w-4 h-4 text-primary" />
        <span className="font-semibold text-sm text-primary">{level}</span>
        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-primary rounded-full"
          />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl p-4 shadow-card"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <p className="font-display font-bold text-lg">Daraja {level}</p>
            <p className="text-xs text-muted-foreground">{xp} XP jami</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-semibold text-primary">{currentXp}/{xpNeeded}</p>
          <p className="text-xs text-muted-foreground">keyingi daraja</p>
        </div>
      </div>
      <Progress value={progress} className="h-3" />
    </motion.div>
  );
});

XpBar.displayName = 'XpBar';

export default XpBar;
