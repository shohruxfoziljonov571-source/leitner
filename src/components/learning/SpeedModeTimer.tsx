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
  const isActiveRef = useRef(isActive);
  
  // Keep onTimeout ref updated
  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  // Keep isActive ref updated
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // Start animation function
  const startAnimation = useCallback(() => {
    cleanup();
    
    if (!isActiveRef.current) return;
    
    setProgress(100);
    setTimeLeft(timeLimit);
    setIsWarning(false);
    hasTimedOutRef.current = false;
    startTimeRef.current = performance.now();

    const animate = (currentTime: number) => {
      if (!isActiveRef.current) {
        return;
      }
      
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
  }, [timeLimit, cleanup]);

  // Start/restart animation when resetTrigger changes or isActive becomes true
  useEffect(() => {
    if (isActive) {
      startAnimation();
    } else {
      cleanup();
    }
    
    return cleanup;
  }, [isActive, resetTrigger, startAnimation, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

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
            isWarning ? 'text-destructive' : 'text-accent'
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
            isWarning ? 'bg-destructive' : 'bg-accent'
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
