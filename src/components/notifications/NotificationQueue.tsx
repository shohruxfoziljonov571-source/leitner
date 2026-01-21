import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Zap, Sparkles, CheckCircle2, XCircle, Trophy, Star, TrendingUp } from 'lucide-react';

// Notification types
type NotificationType = 'xp' | 'streak' | 'success' | 'error' | 'achievement' | 'levelUp' | 'custom';

interface NotificationItem {
  id: string;
  type: NotificationType;
  message: string;
  subMessage?: string;
  icon?: React.ReactNode;
  duration?: number;
  timestamp: number;
  priority?: number; // Higher = shown first
}

interface NotificationContextType {
  showNotification: (notification: Omit<NotificationItem, 'id' | 'timestamp'>) => void;
  showXp: (amount: number, bonusText?: string) => void;
  showStreak: (streak: number) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showAchievement: (title: string, description?: string, icon?: string) => void;
  showLevelUp: (newLevel: number) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

// Global emitter for use outside React components (hooks, etc.)
type NotificationCallback = (notification: Omit<NotificationItem, 'id' | 'timestamp'>) => void;
let globalNotificationCallback: NotificationCallback | null = null;

export const notificationEmitter = {
  emit: (notification: Omit<NotificationItem, 'id' | 'timestamp'>) => {
    if (globalNotificationCallback) {
      globalNotificationCallback(notification);
    }
  },
  showAchievement: (title: string, description?: string, icon?: string) => {
    notificationEmitter.emit({
      type: 'achievement',
      message: `${icon || '🏆'} ${title}`,
      subMessage: description,
      duration: 3500,
      priority: 10, // High priority for achievements
    });
  },
  showLevelUp: (newLevel: number) => {
    notificationEmitter.emit({
      type: 'levelUp',
      message: `Level ${newLevel}!`,
      subMessage: 'Tabriklaymiz! 🎉',
      duration: 3000,
      priority: 15, // Highest priority for level ups
    });
  },
};

export const useNotificationQueue = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationQueue must be used within NotificationProvider');
  }
  return context;
};

// Liquid Glass styled notification component
const LiquidGlassNotification: React.FC<{
  notification: NotificationItem;
  onComplete: () => void;
}> = ({ notification, onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, notification.duration || 2000);
    return () => clearTimeout(timer);
  }, [notification.duration, onComplete]);

  const getTypeStyles = () => {
    switch (notification.type) {
      case 'xp':
        return {
          gradient: 'from-primary/90 via-primary/80 to-primary/70',
          glow: 'shadow-[0_0_30px_rgba(var(--primary-rgb),0.4)]',
          icon: <Sparkles className="w-5 h-5" />,
        };
      case 'streak':
        return {
          gradient: 'from-amber-500/90 via-orange-500/80 to-red-500/70',
          glow: 'shadow-[0_0_30px_rgba(251,146,60,0.4)]',
          icon: notification.message.includes('20') ? <Flame className="w-5 h-5" /> : <Zap className="w-5 h-5" />,
        };
      case 'success':
        return {
          gradient: 'from-emerald-500/90 via-green-500/80 to-teal-500/70',
          glow: 'shadow-[0_0_30px_rgba(16,185,129,0.4)]',
          icon: <CheckCircle2 className="w-5 h-5" />,
        };
      case 'error':
        return {
          gradient: 'from-destructive/90 via-red-500/80 to-rose-500/70',
          glow: 'shadow-[0_0_30px_rgba(239,68,68,0.4)]',
          icon: <XCircle className="w-5 h-5" />,
        };
      case 'achievement':
        return {
          gradient: 'from-violet-500/90 via-purple-500/80 to-fuchsia-500/70',
          glow: 'shadow-[0_0_30px_rgba(139,92,246,0.4)]',
          icon: <Trophy className="w-5 h-5" />,
        };
      case 'levelUp':
        return {
          gradient: 'from-yellow-500/90 via-amber-500/80 to-orange-500/70',
          glow: 'shadow-[0_0_40px_rgba(245,158,11,0.5)]',
          icon: <TrendingUp className="w-5 h-5" />,
        };
      default:
        return {
          gradient: 'from-foreground/20 via-foreground/15 to-foreground/10',
          glow: 'shadow-elevated',
          icon: <Star className="w-5 h-5" />,
        };
    }
  };

  const styles = getTypeStyles();
  const isHighPriority = notification.type === 'levelUp' || notification.type === 'achievement';

  return (
    <motion.div
      initial={{ opacity: 0, y: -30, scale: 0.85, filter: 'blur(10px)' }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -15, scale: 0.9, filter: 'blur(8px)' }}
      transition={{ 
        type: 'spring', 
        stiffness: 350, 
        damping: 25,
        mass: 0.6
      }}
      className="pointer-events-auto"
    >
      {/* iPhone Liquid Glass container */}
      <div
        className={`
          relative overflow-hidden
          ${isHighPriority ? 'px-6 py-4' : 'px-5 py-3'} rounded-[20px]
          bg-gradient-to-r ${styles.gradient}
          ${styles.glow}
          backdrop-blur-xl
          border border-white/20
        `}
      >
        {/* Glass reflection effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-transparent opacity-60 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/20 pointer-events-none" />
        
        {/* Content */}
        <div className="relative flex items-center gap-3">
          {/* Icon with animation */}
          <motion.div
            animate={{ 
              scale: isHighPriority ? [1, 1.2, 1] : [1, 1.1, 1],
              rotate: notification.type === 'streak' ? [0, -5, 5, 0] : 
                      notification.type === 'levelUp' ? [0, -10, 10, 0] : 0
            }}
            transition={{ 
              repeat: (notification.type === 'streak' || notification.type === 'levelUp') ? Infinity : 0, 
              duration: notification.type === 'levelUp' ? 0.6 : 0.5 
            }}
            className="flex-shrink-0 text-white drop-shadow-lg"
          >
            {notification.icon || styles.icon}
          </motion.div>
          
          {/* Text content */}
          <div className={`flex ${isHighPriority ? 'flex-col' : 'flex-row items-center'} gap-1`}>
            <span className={`font-display font-bold text-white drop-shadow-md whitespace-nowrap ${isHighPriority ? 'text-lg' : ''}`}>
              {notification.message}
            </span>
            {notification.subMessage && (
              <span className={`text-white/80 font-medium ${isHighPriority ? 'text-sm' : 'text-sm'}`}>
                {notification.subMessage}
              </span>
            )}
          </div>
        </div>
        
        {/* Animated shine effect */}
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: '200%' }}
          transition={{ 
            repeat: Infinity, 
            duration: isHighPriority ? 1.5 : 2,
            ease: 'linear',
            repeatDelay: isHighPriority ? 0.5 : 1
          }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 pointer-events-none"
        />
      </div>
    </motion.div>
  );
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentNotification, setCurrentNotification] = useState<NotificationItem | null>(null);
  const queueRef = useRef<NotificationItem[]>([]);
  const isShowingRef = useRef(false);
  const idCounterRef = useRef(0);

  const processQueue = useCallback(() => {
    if (isShowingRef.current || queueRef.current.length === 0) return;
    
    // Sort by priority (higher first), then by timestamp (older first)
    queueRef.current.sort((a, b) => {
      const priorityDiff = (b.priority || 0) - (a.priority || 0);
      if (priorityDiff !== 0) return priorityDiff;
      return a.timestamp - b.timestamp;
    });
    
    const next = queueRef.current.shift();
    if (next) {
      isShowingRef.current = true;
      setCurrentNotification(next);
    }
  }, []);

  const handleComplete = useCallback(() => {
    isShowingRef.current = false;
    setCurrentNotification(null);
    // Small delay before showing next notification for smooth transition
    setTimeout(() => processQueue(), 150);
  }, [processQueue]);

  const showNotification = useCallback((notification: Omit<NotificationItem, 'id' | 'timestamp'>) => {
    const newNotification: NotificationItem = {
      ...notification,
      id: `notification-${++idCounterRef.current}`,
      timestamp: Date.now(),
    };
    
    // Smart deduplication: skip if same type is currently showing or in queue
    const isDuplicate = 
      (currentNotification?.type === notification.type && notification.type === 'xp') ||
      queueRef.current.some(n => n.type === notification.type && notification.type === 'xp');
    
    if (isDuplicate) return;
    
    queueRef.current.push(newNotification);
    processQueue();
  }, [processQueue, currentNotification]);

  // Register global callback
  useEffect(() => {
    globalNotificationCallback = showNotification;
    return () => {
      globalNotificationCallback = null;
    };
  }, [showNotification]);

  const showXp = useCallback((amount: number, bonusText?: string) => {
    showNotification({
      type: 'xp',
      message: `+${amount} XP`,
      subMessage: bonusText,
      duration: 1800,
      priority: 1,
    });
  }, [showNotification]);

  const showStreak = useCallback((streak: number) => {
    if (streak < 3) return; // Only show for meaningful streaks
    
    const getStreakLabel = () => {
      if (streak >= 20) return '🔥 UNSTOPPABLE!';
      if (streak >= 15) return '💥 ON FIRE!';
      if (streak >= 10) return '⚡ AMAZING!';
      if (streak >= 5) return '✨ GREAT!';
      if (streak >= 3) return '👍 NICE!';
      return '';
    };

    showNotification({
      type: 'streak',
      message: `x${streak}`,
      subMessage: getStreakLabel(),
      duration: 2000,
      priority: 2,
    });
  }, [showNotification]);

  const showSuccess = useCallback((message: string) => {
    showNotification({
      type: 'success',
      message,
      duration: 2500,
      priority: 3,
    });
  }, [showNotification]);

  const showError = useCallback((message: string) => {
    showNotification({
      type: 'error',
      message,
      duration: 3000,
      priority: 5, // Errors are important
    });
  }, [showNotification]);

  const showAchievement = useCallback((title: string, description?: string, icon?: string) => {
    showNotification({
      type: 'achievement',
      message: `${icon || '🏆'} ${title}`,
      subMessage: description,
      duration: 3500,
      priority: 10, // High priority
    });
  }, [showNotification]);

  const showLevelUp = useCallback((newLevel: number) => {
    showNotification({
      type: 'levelUp',
      message: `Level ${newLevel}!`,
      subMessage: 'Tabriklaymiz! 🎉',
      duration: 3000,
      priority: 15, // Highest priority
    });
  }, [showNotification]);

  return (
    <NotificationContext.Provider value={{ 
      showNotification, 
      showXp, 
      showStreak, 
      showSuccess, 
      showError, 
      showAchievement,
      showLevelUp
    }}>
      {children}
      
      {/* Fixed notification container - single position, no overlap */}
      <div className="fixed top-4 left-0 right-0 z-notification flex justify-center pointer-events-none px-4">
        <AnimatePresence mode="wait">
          {currentNotification && (
            <LiquidGlassNotification
              key={currentNotification.id}
              notification={currentNotification}
              onComplete={handleComplete}
            />
          )}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;
