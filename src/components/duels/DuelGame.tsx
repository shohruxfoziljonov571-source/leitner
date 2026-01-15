import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, Check, X, Trophy, ArrowLeft, Crown, Medal, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useWordDuels } from '@/hooks/useWordDuels';
import { useAuth } from '@/contexts/AuthContext';
import { fireVictoryConfetti, fireGoldConfetti, fireStarConfetti } from '@/lib/confetti';
import TugOfWarAnimation from './TugOfWarAnimation';

interface DuelWord {
  id: string;
  original_word: string;
  translated_word: string;
}

interface DuelGameProps {
  duel: {
    id: string;
    challenger_id: string;
    opponent_id: string;
    word_count: number;
    words: DuelWord[];
    challenger_name?: string;
    opponent_name?: string;
  };
  onComplete: () => void;
}

const DuelGame: React.FC<DuelGameProps> = ({ duel, onComplete }) => {
  const { user } = useAuth();
  const { submitAnswer } = useWordDuels();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [startTime, setStartTime] = useState(Date.now());
  const [results, setResults] = useState<{ correct: boolean; time: number }[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [lastResult, setLastResult] = useState<boolean | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showVictoryAnimation, setShowVictoryAnimation] = useState(false);
  const [playerScore, setPlayerScore] = useState(0);
  const [lastPullResult, setLastPullResult] = useState<'player' | 'opponent' | null>(null);

  const currentWord = duel.words[currentIndex];
  const progress = ((currentIndex) / duel.word_count) * 100;

  // Timer
  useEffect(() => {
    if (isComplete) return;

    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 100);

    return () => clearInterval(interval);
  }, [startTime, isComplete]);

  // Trigger victory animation and confetti
  useEffect(() => {
    if (isComplete) {
      setShowVictoryAnimation(true);
      const accuracy = results.filter(r => r.correct).length / duel.word_count;
      
      // Fire confetti based on performance
      if (accuracy >= 0.8) {
        fireGoldConfetti();
        setTimeout(() => fireStarConfetti(), 500);
      } else if (accuracy >= 0.5) {
        fireVictoryConfetti();
      }
    }
  }, [isComplete, results, duel.word_count]);

  const handleSubmit = useCallback(async () => {
    if (!userInput.trim() || !currentWord) return;

    const responseTime = Date.now() - startTime;
    const isCorrect = userInput.trim().toLowerCase() === currentWord.translated_word.toLowerCase();

    // Show result animation
    setLastResult(isCorrect);
    setShowResult(true);

    // Submit to database
    await submitAnswer(duel.id, currentIndex, isCorrect, responseTime);

    setResults(prev => [...prev, { correct: isCorrect, time: responseTime }]);
    
    // Update player score and trigger tug animation
    if (isCorrect) {
      setPlayerScore(prev => prev + 1);
      setLastPullResult('player');
    } else {
      setLastPullResult('opponent');
    }
    setTimeout(() => setLastPullResult(null), 600);

    setTimeout(() => {
      setShowResult(false);

      if (currentIndex + 1 >= duel.word_count) {
        setIsComplete(true);
      } else {
        setCurrentIndex(prev => prev + 1);
        setUserInput('');
        setStartTime(Date.now());
      }
    }, 1000);
  }, [userInput, currentWord, currentIndex, duel.id, duel.word_count, submitAnswer, startTime]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const tenths = Math.floor((ms % 1000) / 100);
    return `${seconds}.${tenths}s`;
  };

  const totalCorrect = results.filter(r => r.correct).length;
  const totalTime = results.reduce((acc, r) => acc + r.time, 0);
  const accuracy = duel.word_count > 0 ? (totalCorrect / duel.word_count) * 100 : 0;

  if (isComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-12 relative"
      >
        {/* Victory sparkles animation */}
        <AnimatePresence>
          {showVictoryAnimation && (
            <>
              {/* Floating sparkles */}
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ 
                    opacity: 0, 
                    scale: 0,
                    x: 0,
                    y: 0,
                  }}
                  animate={{ 
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0.5],
                    x: (Math.random() - 0.5) * 200,
                    y: (Math.random() - 0.5) * 200,
                  }}
                  transition={{ 
                    duration: 2,
                    delay: i * 0.1,
                    repeat: Infinity,
                    repeatDelay: 1,
                  }}
                  className="absolute left-1/2 top-1/4 text-2xl"
                >
                  {['✨', '⭐', '🌟', '💫'][i % 4]}
                </motion.div>
              ))}
            </>
          )}
        </AnimatePresence>

        {/* Trophy with animation */}
        <motion.div
          initial={{ rotate: 0, y: 20 }}
          animate={{ 
            rotate: [0, -10, 10, -10, 0],
            y: [20, 0, -10, 0],
          }}
          transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
          className={`w-28 h-28 mx-auto mb-6 rounded-3xl flex items-center justify-center relative ${
            accuracy >= 80 
              ? 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-600' 
              : accuracy >= 50 
              ? 'bg-gradient-to-br from-primary to-secondary'
              : 'bg-gradient-to-br from-gray-400 to-gray-500'
          }`}
        >
          {accuracy >= 80 ? (
            <Crown className="w-14 h-14 text-white drop-shadow-lg" />
          ) : accuracy >= 50 ? (
            <Trophy className="w-14 h-14 text-primary-foreground drop-shadow-lg" />
          ) : (
            <Medal className="w-14 h-14 text-white drop-shadow-lg" />
          )}
          
          {/* Glow effect */}
          {accuracy >= 80 && (
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.5, 0.8, 0.5],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-3xl bg-yellow-400 blur-xl -z-10"
            />
          )}
        </motion.div>

        {/* Victory message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h2 className="font-display font-bold text-3xl mb-2 flex items-center justify-center gap-2">
            {accuracy >= 80 ? (
              <>
                <Sparkles className="w-6 h-6 text-yellow-500" />
                Zo'r natija!
                <Sparkles className="w-6 h-6 text-yellow-500" />
              </>
            ) : accuracy >= 50 ? (
              'Yaxshi!'
            ) : (
              'Tugatildi!'
            )}
          </h2>
          <p className="text-muted-foreground mb-6">
            Natijangiz: {totalCorrect}/{duel.word_count} to'g'ri ({Math.round(accuracy)}%)
          </p>
        </motion.div>

        {/* Stats card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7 }}
          className="bg-card rounded-2xl p-6 mb-6 max-w-sm mx-auto shadow-elevated"
        >
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <motion.p 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.9, type: 'spring' }}
                className="text-3xl font-bold text-green-500"
              >
                {totalCorrect}
              </motion.p>
              <p className="text-xs text-muted-foreground">To'g'ri</p>
            </div>
            <div>
              <motion.p 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1.0, type: 'spring' }}
                className="text-3xl font-bold text-red-500"
              >
                {duel.word_count - totalCorrect}
              </motion.p>
              <p className="text-xs text-muted-foreground">Noto'g'ri</p>
            </div>
            <div>
              <motion.p 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1.1, type: 'spring' }}
                className="text-3xl font-bold"
              >
                {formatTime(totalTime)}
              </motion.p>
              <p className="text-xs text-muted-foreground">Vaqt</p>
            </div>
          </div>
        </motion.div>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="text-sm text-muted-foreground mb-6"
        >
          Raqibingiz o'ynashini kuting...
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4 }}
        >
          <Button onClick={onComplete} variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Orqaga
          </Button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      {/* Tug of War Animation */}
      <TugOfWarAnimation
        playerScore={playerScore}
        opponentScore={duel.word_count - currentIndex - playerScore}
        totalQuestions={duel.word_count}
        playerName={duel.challenger_id === user?.id ? (duel.challenger_name || 'Siz') : (duel.opponent_name || 'Siz')}
        opponentName={duel.challenger_id === user?.id ? (duel.opponent_name || 'Raqib') : (duel.challenger_name || 'Raqib')}
        lastResult={lastPullResult}
        isComplete={isComplete}
        winnerId={null}
        playerId={user?.id || ''}
      />

      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">
            {currentIndex + 1} / {duel.word_count}
          </span>
          <div className="flex items-center gap-1 text-sm text-primary">
            <Timer className="w-4 h-4" />
            {formatTime(elapsedTime)}
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Results indicator */}
      <div className="flex justify-center gap-2 mb-6">
        {Array.from({ length: duel.word_count }).map((_, i) => (
          <motion.div
            key={i}
            initial={i === currentIndex ? { scale: 0 } : {}}
            animate={i === currentIndex ? { scale: 1 } : {}}
            className={`w-3 h-3 rounded-full transition-colors ${
              i < results.length
                ? results[i].correct
                  ? 'bg-green-500'
                  : 'bg-red-500'
                : i === currentIndex
                ? 'bg-primary animate-pulse'
                : 'bg-muted'
            }`}
          />
        ))}
      </div>

      {/* Word card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 50, rotateY: -15 }}
          animate={{ opacity: 1, x: 0, rotateY: 0 }}
          exit={{ opacity: 0, x: -50, rotateY: 15 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="bg-card rounded-3xl p-8 shadow-elevated mb-6 relative overflow-hidden"
        >
          {/* Result overlay */}
          <AnimatePresence>
            {showResult && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                className={`absolute inset-0 flex items-center justify-center ${
                  lastResult ? 'bg-green-500/90' : 'bg-red-500/90'
                }`}
              >
                {lastResult ? (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                  >
                    <Check className="w-20 h-20 text-white drop-shadow-lg" />
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-center text-white"
                  >
                    <motion.div
                      animate={{ x: [-5, 5, -5, 5, 0] }}
                      transition={{ duration: 0.4 }}
                    >
                      <X className="w-20 h-20 mx-auto mb-2 drop-shadow-lg" />
                    </motion.div>
                    <p className="font-medium text-lg">{currentWord?.translated_word}</p>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-center text-sm text-muted-foreground mb-2">
            Tarjima qiling:
          </p>
          <motion.h2 
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="text-center font-display font-bold text-3xl mb-6"
          >
            {currentWord?.original_word}
          </motion.h2>

          <Input
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Tarjimani kiriting..."
            className="text-center text-lg h-14"
            autoFocus
            disabled={showResult}
          />
        </motion.div>
      </AnimatePresence>

      <motion.div
        whileTap={{ scale: 0.98 }}
      >
        <Button
          onClick={handleSubmit}
          className="w-full h-14 text-lg"
          disabled={!userInput.trim() || showResult}
        >
          Tasdiqlash
        </Button>
      </motion.div>
    </div>
  );
};

export default DuelGame;
