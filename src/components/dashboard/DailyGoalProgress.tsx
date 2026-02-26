import React from 'react';
import { motion } from 'framer-motion';
import { Target, Trophy, Flame } from 'lucide-react';

interface DailyGoalProgressProps {
  reviewed: number;
  goal: number;
}

const DailyGoalProgress: React.FC<DailyGoalProgressProps> = ({ reviewed, goal }) => {
  const progress = Math.min((reviewed / goal) * 100, 100);
  const isCompleted = reviewed >= goal;
  const remaining = Math.max(goal - reviewed, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl p-3.5 ${
        isCompleted 
          ? 'bg-primary/10 border border-primary/20' 
          : 'bg-card shadow-card'
      }`}
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          {isCompleted ? (
            <Trophy className="w-4 h-4 text-primary" />
          ) : (
            <Target className="w-4 h-4 text-primary" />
          )}
          <span className="font-medium text-xs">Kunlik maqsad</span>
        </div>
        <div className="text-xs">
          <span className="font-bold text-primary">{reviewed}</span>
          <span className="text-muted-foreground">/{goal}</span>
        </div>
      </div>

      <div className="h-2 bg-muted rounded-full overflow-hidden mb-1.5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.6 }}
          className="h-full gradient-primary rounded-full"
        />
      </div>

      <div className="flex items-center justify-between text-[11px]">
        {isCompleted ? (
          <div className="flex items-center gap-1 text-primary font-medium">
            <Flame className="w-3 h-3" />
            <span>Maqsadga erishildi! 🎉</span>
          </div>
        ) : (
          <span className="text-muted-foreground">
            Yana {remaining} so'z
          </span>
        )}
        <span className="text-muted-foreground">{Math.round(progress)}%</span>
      </div>
    </motion.div>
  );
};

export default DailyGoalProgress;
