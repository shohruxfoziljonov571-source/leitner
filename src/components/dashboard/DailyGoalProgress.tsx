import React from 'react';
import { motion } from 'framer-motion';
import { Target, Trophy, Flame } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

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
      className={`rounded-2xl p-4 ${
        isCompleted 
          ? 'bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20' 
          : 'bg-card shadow-card'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isCompleted ? (
            <motion.div
              initial={{ rotate: 0 }}
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 0.5 }}
            >
              <Trophy className="w-5 h-5 text-primary" />
            </motion.div>
          ) : (
            <Target className="w-5 h-5 text-primary" />
          )}
          <span className="font-medium text-sm">Kunlik maqsad</span>
        </div>
        <div className="text-sm">
          <span className="font-bold text-primary">{reviewed}</span>
          <span className="text-muted-foreground">/{goal}</span>
        </div>
      </div>

      <Progress 
        value={progress} 
        className="h-3 mb-2" 
      />

      <div className="flex items-center justify-between text-xs">
        {isCompleted ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-1 text-primary font-medium"
          >
            <Flame className="w-4 h-4" />
            <span>Maqsadga erishildi! 🎉</span>
          </motion.div>
        ) : (
          <span className="text-muted-foreground">
            Yana {remaining} so'z qoldi
          </span>
        )}
        <span className="text-muted-foreground">{Math.round(progress)}%</span>
      </div>
    </motion.div>
  );
};

export default DailyGoalProgress;
