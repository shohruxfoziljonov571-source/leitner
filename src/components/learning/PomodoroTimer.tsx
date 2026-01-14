import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, Play, Pause, RotateCcw, Coffee } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PomodoroTimerProps {
  onBreakStart?: () => void;
  onBreakEnd?: () => void;
}

const WORK_TIME = 25 * 60; // 25 minutes
const BREAK_TIME = 5 * 60; // 5 minutes

const PomodoroTimer: React.FC<PomodoroTimerProps> = ({ onBreakStart, onBreakEnd }) => {
  const [timeLeft, setTimeLeft] = useState(WORK_TIME);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [showBreakModal, setShowBreakModal] = useState(false);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const reset = useCallback(() => {
    setTimeLeft(isBreak ? BREAK_TIME : WORK_TIME);
    setIsRunning(false);
  }, [isBreak]);

  const startBreak = useCallback(() => {
    setIsBreak(true);
    setTimeLeft(BREAK_TIME);
    setIsRunning(true);
    setShowBreakModal(false);
    onBreakStart?.();
  }, [onBreakStart]);

  const skipBreak = useCallback(() => {
    setShowBreakModal(false);
    setTimeLeft(WORK_TIME);
    setIsRunning(true);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      if (isBreak) {
        // Break ended
        setIsBreak(false);
        setTimeLeft(WORK_TIME);
        setIsRunning(true);
        onBreakEnd?.();
      } else {
        // Work session ended - show break modal
        setIsRunning(false);
        setShowBreakModal(true);
      }
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft, isBreak, onBreakEnd]);

  const progress = isBreak 
    ? ((BREAK_TIME - timeLeft) / BREAK_TIME) * 100
    : ((WORK_TIME - timeLeft) / WORK_TIME) * 100;

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="relative">
          <div 
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              isBreak 
                ? 'bg-amber-500/20 text-amber-600' 
                : 'bg-primary/10 text-primary'
            }`}
          >
            {isBreak ? <Coffee className="w-4 h-4" /> : <Timer className="w-4 h-4" />}
            <span className="font-mono">{formatTime(timeLeft)}</span>
          </div>
          {/* Progress ring */}
          <svg 
            className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
            viewBox="0 0 100 100"
          >
            <circle
              cx="50"
              cy="50"
              r="48"
              fill="none"
              strokeWidth="2"
              className="stroke-primary/20"
            />
            <circle
              cx="50"
              cy="50"
              r="48"
              fill="none"
              strokeWidth="2"
              strokeDasharray={`${progress * 3.02} 302`}
              className={isBreak ? 'stroke-amber-500' : 'stroke-primary'}
              strokeLinecap="round"
            />
          </svg>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsRunning(!isRunning)}
          className="h-8 w-8 rounded-full"
        >
          {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={reset}
          className="h-8 w-8 rounded-full"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      {/* Break Modal */}
      <AnimatePresence>
        {showBreakModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card p-8 rounded-3xl shadow-elevated max-w-sm mx-4 text-center"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-20 h-20 mx-auto mb-4 rounded-full bg-amber-500/20 flex items-center justify-center"
              >
                <Coffee className="w-10 h-10 text-amber-500" />
              </motion.div>
              <h3 className="font-display font-bold text-xl mb-2">
                Dam olish vaqti! ☕
              </h3>
              <p className="text-muted-foreground mb-6">
                25 daqiqa o'qidingiz. 5 daqiqa dam oling!
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={skipBreak}
                  className="flex-1"
                >
                  O'tkazib yuborish
                </Button>
                <Button
                  onClick={startBreak}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                >
                  Dam olish
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default PomodoroTimer;
