import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, Check, X, Trophy, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useWordDuels } from '@/hooks/useWordDuels';
import { useAuth } from '@/contexts/AuthContext';

interface DuelWord {
  id: string;
  original_word: string;
  translated_word: string;
}

interface DuelGameProps {
  duel: {
    id: string;
    challenger_id: string;
    word_count: number;
    words: DuelWord[];
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

  const currentWord = duel.words[currentIndex];
  const isChallenger = duel.challenger_id === user?.id;
  const progress = ((currentIndex) / duel.word_count) * 100;

  // Timer
  useEffect(() => {
    if (isComplete) return;

    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 100);

    return () => clearInterval(interval);
  }, [startTime, isComplete]);

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

  if (isComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-12"
      >
        <motion.div
          initial={{ rotate: 0 }}
          animate={{ rotate: [0, -10, 10, -10, 0] }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center"
        >
          <Trophy className="w-12 h-12 text-primary-foreground" />
        </motion.div>

        <h2 className="font-display font-bold text-2xl mb-2">
          Tugatildi!
        </h2>
        <p className="text-muted-foreground mb-6">
          Natijangiz: {totalCorrect}/{duel.word_count} to'g'ri
        </p>

        <div className="bg-card rounded-2xl p-4 mb-6 max-w-sm mx-auto">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{totalCorrect}</p>
              <p className="text-sm text-muted-foreground">To'g'ri</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{formatTime(totalTime)}</p>
              <p className="text-sm text-muted-foreground">Umumiy vaqt</p>
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          Raqibingiz o'ynashini kuting...
        </p>

        <Button onClick={onComplete} variant="outline" className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Orqaga
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
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
          <div
            key={i}
            className={`w-3 h-3 rounded-full ${
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
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          className="bg-card rounded-3xl p-8 shadow-elevated mb-6 relative overflow-hidden"
        >
          {/* Result overlay */}
          <AnimatePresence>
            {showResult && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`absolute inset-0 flex items-center justify-center ${
                  lastResult ? 'bg-green-500/90' : 'bg-red-500/90'
                }`}
              >
                {lastResult ? (
                  <Check className="w-16 h-16 text-white" />
                ) : (
                  <div className="text-center text-white">
                    <X className="w-16 h-16 mx-auto mb-2" />
                    <p className="font-medium">{currentWord?.translated_word}</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-center text-sm text-muted-foreground mb-2">
            Tarjima qiling:
          </p>
          <h2 className="text-center font-display font-bold text-3xl mb-6">
            {currentWord?.original_word}
          </h2>

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

      <Button
        onClick={handleSubmit}
        className="w-full h-14 text-lg"
        disabled={!userInput.trim() || showResult}
      >
        Tasdiqlash
      </Button>
    </div>
  );
};

export default DuelGame;
