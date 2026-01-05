import React from 'react';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { Achievement } from '@/hooks/useGamification';

interface AchievementBadgeProps {
  achievement: Achievement;
  unlocked: boolean;
  delay?: number;
}

const AchievementBadge: React.FC<AchievementBadgeProps> = ({ 
  achievement, 
  unlocked, 
  delay = 0 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      className={`relative p-4 rounded-2xl text-center transition-all ${
        unlocked 
          ? 'bg-card shadow-card hover:shadow-elevated' 
          : 'bg-muted/50 opacity-60'
      }`}
    >
      <div className={`text-4xl mb-2 ${!unlocked && 'grayscale'}`}>
        {unlocked ? achievement.icon : <Lock className="w-8 h-8 mx-auto text-muted-foreground" />}
      </div>
      <h4 className={`font-semibold text-sm mb-1 ${unlocked ? 'text-foreground' : 'text-muted-foreground'}`}>
        {achievement.name}
      </h4>
      <p className="text-xs text-muted-foreground line-clamp-2">
        {achievement.description}
      </p>
      {unlocked && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center"
        >
          <span className="text-xs">✓</span>
        </motion.div>
      )}
    </motion.div>
  );
};

export default AchievementBadge;
