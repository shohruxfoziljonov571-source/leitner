import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Zap } from 'lucide-react';

interface StreakComboProps {
  streak: number;
  show: boolean;
}

const StreakCombo: React.FC<StreakComboProps> = ({ streak, show }) => {
  const getStreakLevel = () => {
    if (streak >= 20) return { color: 'text-orange-500', bg: 'bg-orange-500/20', label: '🔥 UNSTOPPABLE!' };
    if (streak >= 15) return { color: 'text-red-500', bg: 'bg-red-500/20', label: '💥 ON FIRE!' };
    if (streak >= 10) return { color: 'text-amber-500', bg: 'bg-amber-500/20', label: '⚡ AMAZING!' };
    if (streak >= 5) return { color: 'text-yellow-500', bg: 'bg-yellow-500/20', label: '✨ GREAT!' };
    if (streak >= 3) return { color: 'text-primary', bg: 'bg-primary/20', label: '👍 NICE!' };
    return { color: 'text-muted-foreground', bg: 'bg-muted', label: '' };
  };

  const level = getStreakLevel();

  if (streak < 2) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-40"
        >
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 0.5,
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full ${level.bg} backdrop-blur-sm`}
          >
            <motion.div
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ repeat: Infinity, duration: 0.3 }}
            >
              {streak >= 10 ? (
                <Flame className={`w-6 h-6 ${level.color}`} />
              ) : (
                <Zap className={`w-6 h-6 ${level.color}`} />
              )}
            </motion.div>
            <span className={`font-bold text-lg ${level.color}`}>
              x{streak}
            </span>
            {level.label && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`font-bold ${level.color}`}
              >
                {level.label}
              </motion.span>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StreakCombo;
