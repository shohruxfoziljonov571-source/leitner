import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Volume2, VolumeX, Send, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSpeech } from '@/hooks/useSpeech';
import { Word } from '@/types/word';
import { getLanguageName, getLanguageFlag } from '@/lib/languages';

interface WritingCardProps {
  word: Word;
  onAnswer: (isCorrect: boolean) => void;
  isReversed?: boolean;
}

// Levenshtein distance - 1-2 xatoga ruxsat (kelajak uchun qoldirilgan)
const normalize = (str: string) => str.trim().toLowerCase();

const WritingCard: React.FC<WritingCardProps> = ({ word, onAnswer, isReversed = false }) => {
  const { speak, isSpeaking, isSupported, stop } = useSpeech();
  const [inputValue, setInputValue] = useState('');
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null);
  const [showHint, setShowHint] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const questionWord = isReversed ? word.translatedWord : word.originalWord;
  const correctAnswer = isReversed ? word.originalWord : word.translatedWord;
  const questionLang = isReversed ? word.targetLanguage : word.sourceLanguage;
  const answerLang = isReversed ? word.sourceLanguage : word.targetLanguage;

  // Auto-focus only on non-touch devices to avoid keyboard popping up unexpectedly on mobile
  useEffect(() => {
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!isTouchDevice) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [word.id]);

  const handleSpeak = () => {
    if (isSpeaking) stop();
    else speak(questionWord, { lang: questionLang });
  };

  const handleSubmit = () => {
    if (!inputValue.trim() || result) return;

    const isCorrect = normalize(inputValue) === normalize(correctAnswer);
    setResult(isCorrect ? 'correct' : 'incorrect');

    setTimeout(() => {
      onAnswer(isCorrect);
      setInputValue('');
      setResult(null);
      setShowHint(false);
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  const handleSkip = () => {
    setResult('incorrect');
    setTimeout(() => {
      onAnswer(false);
      setInputValue('');
      setResult(null);
      setShowHint(false);
    }, 1200);
  };

  // Hint: show first letter
  const hint = correctAnswer.length > 0
    ? correctAnswer[0] + '_'.repeat(Math.max(0, correctAnswer.length - 1))
    : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-lg mx-auto"
    >
      <div
        className={`relative rounded-2xl shadow-elevated p-4 transition-all duration-300 ${
          result === 'correct'
            ? 'bg-primary/10 ring-2 ring-primary'
            : result === 'incorrect'
            ? 'bg-destructive/10 ring-2 ring-destructive'
            : 'bg-card'
        }`}
      >
        {/* Box indicator */}
        <div
          className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-medium"
          style={{
            backgroundColor: `hsl(var(--box-${word.boxNumber}) / 0.15)`,
            color: `hsl(var(--box-${word.boxNumber}))`,
          }}
        >
          Box {word.boxNumber}
        </div>

        {/* Language badges */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">{getLanguageFlag(questionLang)}</span>
          <ArrowRight className="w-3 h-3 text-muted-foreground" />
          <span className="text-xl">{getLanguageFlag(answerLang)}</span>
        </div>

        {/* Question word */}
        <div className="text-center mb-4">
          <p className="text-xs text-muted-foreground mb-1.5">
            {getLanguageName(questionLang)}
          </p>
          <div className="flex items-center justify-center gap-2">
            <h2 className="font-display font-bold text-2xl text-foreground break-words min-w-0 flex-1 text-center">
              {questionWord}
            </h2>
            {isSupported && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSpeak}
                className={`rounded-full transition-all flex-shrink-0 h-9 w-9 ${
                  isSpeaking ? 'text-primary animate-pulse' : 'text-muted-foreground hover:text-primary'
                }`}
              >
                {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            {getLanguageName(answerLang)} tilida yozing:
          </p>
        </div>

        {/* Input area */}
        <div className="space-y-3">
          {/* Input + Send in a row */}
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tarjimani yozing..."
              disabled={!!result}
              className={`flex-1 h-12 text-base transition-all ${
                result === 'correct'
                  ? 'border-primary text-primary bg-primary/5'
                  : result === 'incorrect'
                  ? 'border-destructive text-destructive bg-destructive/5'
                  : ''
              }`}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            <Button
              onClick={handleSubmit}
              disabled={!inputValue.trim() || !!result}
              size="icon"
              className="h-12 w-12 flex-shrink-0 gradient-primary text-primary-foreground"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>

          {/* Result feedback */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-center py-1"
              >
                {result === 'correct' ? (
                  <p className="text-primary font-semibold text-lg">✓ To'g'ri!</p>
                ) : (
                  <div>
                    <p className="text-destructive font-semibold">✗ Noto'g'ri</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      To'g'ri javob:{' '}
                      <span className="font-semibold text-foreground">{correctAnswer}</span>
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hint row — bigger touch targets */}
          {!result && (
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowHint(v => !v)}
                className="min-h-[36px] px-2 text-xs text-muted-foreground hover:text-primary transition-colors flex items-center"
              >
                {showHint ? `💡 ${hint}` : "💡 Maslahat ko'rish"}
              </button>
              <button
                onClick={handleSkip}
                className="min-h-[36px] px-2 text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                O'tkazib yuborish
              </button>
            </div>
          )}
        </div>

        {/* Example sentences (shown after answering) */}
        {result && word.exampleSentences.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 bg-muted/50 rounded-xl"
          >
            <p className="text-xs text-muted-foreground mb-1">Misol:</p>
            <p className="text-sm italic text-foreground">• {word.exampleSentences[0]}</p>
          </motion.div>
        )}
      </div>

      <div className="mt-3 text-center">
        <p className="text-xs text-muted-foreground">
          {word.timesReviewed} marta takrorlangan
        </p>
      </div>
    </motion.div>
  );
};

export default WritingCard;
