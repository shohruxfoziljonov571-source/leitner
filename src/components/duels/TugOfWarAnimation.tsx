import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';

interface TugOfWarAnimationProps {
  playerScore: number;
  opponentScore: number;
  totalQuestions: number;
  playerName: string;
  opponentName: string;
  lastResult?: 'player' | 'opponent' | null;
  isComplete: boolean;
  winnerId?: string | null;
  playerId: string;
}

const TugOfWarAnimation: React.FC<TugOfWarAnimationProps> = ({
  playerScore,
  opponentScore,
  totalQuestions,
  playerName,
  opponentName,
  lastResult,
  isComplete,
  winnerId,
  playerId,
}) => {
  const ropeControls = useAnimation();
  const [showPull, setShowPull] = useState<'left' | 'right' | null>(null);
  
  // Calculate rope position based on score difference
  // Range: -50 (opponent wins) to +50 (player wins)
  const scoreDiff = playerScore - opponentScore;
  const maxDiff = totalQuestions;
  const ropePosition = (scoreDiff / maxDiff) * 40;
  
  // Animate rope when scores change
  useEffect(() => {
    if (lastResult) {
      setShowPull(lastResult === 'player' ? 'left' : 'right');
      
      // Shake animation
      ropeControls.start({
        x: [0, lastResult === 'player' ? -10 : 10, 0],
        transition: { duration: 0.3, ease: 'easeOut' }
      });
      
      setTimeout(() => setShowPull(null), 500);
    }
  }, [playerScore, opponentScore, lastResult]);

  // Player strength based on wins
  const getPlayerStrength = (score: number) => {
    if (score >= 8) return { scale: 1.3, emoji: '💪🏆', label: 'Chempion' };
    if (score >= 6) return { scale: 1.2, emoji: '💪', label: 'Kuchli' };
    if (score >= 4) return { scale: 1.1, emoji: '🏃', label: 'Yaxshi' };
    if (score >= 2) return { scale: 1.05, emoji: '🚶', label: 'O\'rta' };
    return { scale: 1, emoji: '🧍', label: 'Boshlang\'ich' };
  };

  const playerStrength = getPlayerStrength(playerScore);
  const opponentStrength = getPlayerStrength(opponentScore);

  const isPlayerWinner = winnerId === playerId;

  return (
    <div className="relative py-6 px-4">
      {/* Victory overlay */}
      <AnimatePresence>
        {isComplete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 10 }}
              className={`text-4xl ${isPlayerWinner ? 'text-primary' : 'text-destructive'}`}
            >
              {isPlayerWinner ? '🏆' : '😔'}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Arena */}
      <div className="relative h-40 bg-gradient-to-b from-muted/30 to-muted/10 rounded-2xl overflow-hidden border border-muted">
        {/* Ground */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-amber-900/30 to-transparent" />
        
        {/* Center line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-muted-foreground/20 -translate-x-1/2" />
        
        {/* Pull effect particles */}
        <AnimatePresence>
          {showPull && (
            <>
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ 
                    opacity: 1, 
                    x: showPull === 'left' ? '50%' : '50%',
                    y: '50%',
                    scale: 1
                  }}
                  animate={{ 
                    opacity: 0, 
                    x: showPull === 'left' 
                      ? `${30 - i * 5}%` 
                      : `${70 + i * 5}%`,
                    y: `${40 + Math.random() * 20}%`,
                    scale: 0.5
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.03 }}
                  className="absolute w-3 h-3 rounded-full bg-primary/50"
                />
              ))}
            </>
          )}
        </AnimatePresence>

        {/* Rope */}
        <motion.div
          animate={{ x: ropePosition }}
          transition={{ type: 'spring', stiffness: 100, damping: 15 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full"
        >
          <motion.div animate={ropeControls} className="relative">
            {/* Rope line */}
            <div className="absolute left-8 right-8 h-3 bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 rounded-full top-1/2 -translate-y-1/2 shadow-md">
              {/* Rope texture */}
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-0.5 h-full bg-amber-800/30"
                  style={{ left: `${i * 5}%` }}
                />
              ))}
            </div>
            
            {/* Center marker (flag) */}
            <motion.div
              className="absolute left-1/2 -translate-x-1/2 -top-6"
              animate={lastResult ? { y: [0, -5, 0] } : {}}
              transition={{ duration: 0.3 }}
            >
              <div className="w-0.5 h-8 bg-muted-foreground" />
              <div className="w-6 h-4 bg-destructive -mt-4 ml-0.5 rounded-r-sm shadow-sm" />
            </motion.div>

            {/* Player (left) */}
            <motion.div
              className="absolute left-4 -translate-y-1/2 flex flex-col items-center"
              animate={{ 
                scale: playerStrength.scale,
                x: showPull === 'left' ? -5 : 0 
              }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <motion.div
                animate={showPull === 'left' ? { 
                  rotate: [-5, 5, -5],
                  x: [-3, 0, -3]
                } : {}}
                transition={{ duration: 0.2 }}
                className="text-3xl"
              >
                {playerStrength.emoji}
              </motion.div>
              <span className="text-[10px] font-medium text-muted-foreground mt-1 whitespace-nowrap">
                {playerName.slice(0, 8)}
              </span>
            </motion.div>

            {/* Opponent (right) */}
            <motion.div
              className="absolute right-4 -translate-y-1/2 flex flex-col items-center"
              animate={{ 
                scale: opponentStrength.scale,
                x: showPull === 'right' ? 5 : 0 
              }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <motion.div
                animate={showPull === 'right' ? { 
                  rotate: [5, -5, 5],
                  x: [3, 0, 3]
                } : {}}
                transition={{ duration: 0.2 }}
                className="text-3xl transform scale-x-[-1]"
              >
                {opponentStrength.emoji}
              </motion.div>
              <span className="text-[10px] font-medium text-muted-foreground mt-1 whitespace-nowrap">
                {opponentName.slice(0, 8)}
              </span>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Zone indicators */}
        <div className="absolute left-0 top-0 bottom-0 w-1/4 bg-gradient-to-r from-primary/20 to-transparent" />
        <div className="absolute right-0 top-0 bottom-0 w-1/4 bg-gradient-to-l from-destructive/20 to-transparent" />
      </div>

      {/* Score display */}
      <div className="flex justify-between items-center mt-4 px-2">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ scale: lastResult === 'player' ? [1, 1.3, 1] : 1 }}
            className={`text-2xl font-bold ${playerScore > opponentScore ? 'text-primary' : 'text-foreground'}`}
          >
            {playerScore}
          </motion.div>
          <span className="text-xs text-muted-foreground">{playerStrength.label}</span>
        </div>
        
        <div className="text-sm text-muted-foreground">vs</div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{opponentStrength.label}</span>
          <motion.div
            animate={{ scale: lastResult === 'opponent' ? [1, 1.3, 1] : 1 }}
            className={`text-2xl font-bold ${opponentScore > playerScore ? 'text-destructive' : 'text-foreground'}`}
          >
            {opponentScore}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default TugOfWarAnimation;
