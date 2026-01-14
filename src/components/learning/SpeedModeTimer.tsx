import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

interface SpeedModeTimerProps {
  isActive: boolean;
  onTimeout: () => void;
  timeLimit?: number; // seconds
  resetTrigger?: number; // changes when we need to reset
}

const SpeedModeTimer: React.FC<SpeedModeTimerProps> = ({ 
  isActive, 
  onTimeout, 
  timeLimit = 10,
  resetTrigger 
}) => {
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [isWarning, setIsWarning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const reset = useCallback(() => {
    setTimeLeft(timeLimit);
    setIsWarning(false);
  }, [timeLimit]);

  useEffect(() => {
    reset();
  }, [resetTrigger, reset]);

  useEffect(() => {
    if (!isActive) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          onTimeout();
          return timeLimit;
        }
        if (prev <= 4) {
          setIsWarning(true);
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, onTimeout, timeLimit]);

  const progress = (timeLeft / timeLimit) * 100;

  if (!isActive) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3"
    >
      <div className="flex items-center gap-2">
        <motion.div
          animate={isWarning ? { scale: [1, 1.2, 1] } : {}}
          transition={{ repeat: isWarning ? Infinity : 0, duration: 0.3 }}
        >
          <Zap className={`w-5 h-5 ${isWarning ? 'text-destructive' : 'text-amber-500'}`} />
        </motion.div>
        <span className={`font-mono font-bold text-lg ${isWarning ? 'text-destructive' : 'text-foreground'}`}>
          {timeLeft}s
        </span>
      </div>
      
      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full transition-colors ${
            isWarning ? 'bg-destructive' : 'bg-amber-500'
          }`}
          initial={{ width: '100%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </motion.div>
  );
};

export default SpeedModeTimer;
