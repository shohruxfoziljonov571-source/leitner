import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ChallengeRewardBadgeProps {
  type: 'gold' | 'silver' | 'bronze';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animate?: boolean;
}

const ChallengeRewardBadge: React.FC<ChallengeRewardBadgeProps> = ({
  type,
  size = 'md',
  showLabel = false,
  animate = false,
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-lg',
    md: 'w-12 h-12 text-2xl',
    lg: 'w-16 h-16 text-3xl',
  };

  const colors = {
    gold: 'from-yellow-400 to-amber-500 shadow-yellow-500/30',
    silver: 'from-gray-300 to-slate-400 shadow-gray-400/30',
    bronze: 'from-orange-400 to-amber-600 shadow-orange-500/30',
  };

  const labels = {
    gold: "Oltin",
    silver: "Kumush",
    bronze: "Bronza",
  };

  const emojis = {
    gold: '🥇',
    silver: '🥈',
    bronze: '🥉',
  };

  const badgeClassName = cn(
    'rounded-full bg-gradient-to-br flex items-center justify-center shadow-lg',
    sizeClasses[size],
    colors[type]
  );

  return (
    <div className="flex flex-col items-center gap-1">
      {animate ? (
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className={badgeClassName}
        >
          <span>{emojis[type]}</span>
        </motion.div>
      ) : (
        <div className={badgeClassName}>
          <span>{emojis[type]}</span>
        </div>
      )}
      {showLabel && (
        <span className="text-xs font-medium text-muted-foreground">
          {labels[type]}
        </span>
      )}
    </div>
  );
};

export default ChallengeRewardBadge;
