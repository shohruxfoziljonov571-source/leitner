import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

interface SpeedModeTimerProps {
  isActive: boolean;
  onTimeout: () => void;
  timeLimit?: number; // seconds
  resetTrigger?: number; // changes when we need to reset
}

const SpeedModeTimer: React.FC<SpeedModeTimerProps> = memo(({ 
  isActive, 
  onTimeout, 
  timeLimit = 10,
  resetTrigger 
}) => {
  const [progress, setProgress] = useState(100);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [isWarning, setIsWarning] = useState(false);
  
  const startTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const hasTimedOutRef = useRef(false);
  const onTimeoutRef = useRef(onTimeout);
  
  // Keep onTimeout ref updated
  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  const reset = useCallback(() => {
    setProgress(100);
    setTimeLeft(timeLimit);
    setIsWarning(false);
    hasTimedOutRef.current = false;
    startTimeRef.current = performance.now();
  }, [timeLimit]);

  // Reset when trigger changes
  useEffect(() => {
    reset();
  }, [resetTrigger, reset]);

  // Main animation loop using requestAnimationFrame for smooth updates
  useEffect(() => {
    if (!isActive) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    startTimeRef.current = performance.now();
    hasTimedOutRef.current = false;

    const animate = (currentTime: number) => {
      const elapsed = (currentTime - startTimeRef.current) / 1000;
      const remaining = Math.max(0, timeLimit - elapsed);
      const newProgress = (remaining / timeLimit) * 100;
      
      setProgress(newProgress);
      setTimeLeft(Math.ceil(remaining));
      setIsWarning(remaining <= 3);

      if (remaining <= 0 && !hasTimedOutRef.current) {
        hasTimedOutRef.current = true;
        onTimeoutRef.current();
        return;
      }

      if (remaining > 0) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isActive, timeLimit]);

  if (!isActive) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-2 sm:gap-3"
    >
      <div className="flex items-center gap-1.5 sm:gap-2">
        <motion.div
          animate={isWarning ? { 
            scale: [1, 1.15, 1],
            rotate: [0, -5, 5, 0]
          } : {}}
          transition={{ 
            repeat: isWarning ? Infinity : 0, 
            duration: 0.4,
            ease: "easeInOut"
          }}
        >
          <Zap className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors duration-200 ${
            isWarning ? 'text-destructive' : 'text-amber-500'
          }`} />
        </motion.div>
        <span className={`font-mono font-bold text-base sm:text-lg tabular-nums transition-colors duration-200 ${
          isWarning ? 'text-destructive' : 'text-foreground'
        }`}>
          {timeLeft}s
        </span>
      </div>
      
      <div className="w-16 sm:w-24 h-1.5 sm:h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full transition-colors duration-300 ${
            isWarning ? 'bg-destructive' : 'bg-amber-500'
          }`}
          style={{ 
            width: `${progress}%`,
            transition: 'width 50ms linear'
          }}
        />
      </div>
    </motion.div>
  );
});

SpeedModeTimer.displayName = 'SpeedModeTimer';

export default SpeedModeTimer;
