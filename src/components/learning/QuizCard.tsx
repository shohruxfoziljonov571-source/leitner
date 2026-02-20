import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Volume2, VolumeX, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSpeech } from '@/hooks/useSpeech';
import { Word } from '@/types/word';
import { getLanguageName, getLanguageFlag } from '@/lib/languages';

interface QuizCardProps {
  word: Word;
  allWords: Word[];
  onAnswer: (isCorrect: boolean) => void;
  isReversed?: boolean;
}

// Fisher-Yates shuffle
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const QuizCard: React.FC<QuizCardProps> = ({ word, allWords, onAnswer, isReversed = false }) => {
  const { t } = useLanguage();
  const { speak, isSpeaking, isSupported, stop } = useSpeech();
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  const questionWord = isReversed ? word.translatedWord : word.originalWord;
  const correctAnswer = isReversed ? word.originalWord : word.translatedWord;
  const questionLang = isReversed ? word.targetLanguage : word.sourceLanguage;
  const answerLang = isReversed ? word.sourceLanguage : word.targetLanguage;

  // Generate 4 options (1 correct + 3 wrong)
  const options = useMemo(() => {
    const wrongAnswers = allWords
      .filter(w => w.id !== word.id)
      .map(w => isReversed ? w.originalWord : w.translatedWord)
      .filter((answer, index, self) => self.indexOf(answer) === index); // Remove duplicates
    
    const shuffledWrong = shuffleArray(wrongAnswers).slice(0, 3);
    const allOptions = [...shuffledWrong, correctAnswer];
    return shuffleArray(allOptions);
  }, [word.id, allWords, isReversed, correctAnswer]);

  const handleSelectAnswer = (answer: string) => {
    if (showResult) return;
    
    setSelectedAnswer(answer);
    setShowResult(true);
    
    const isCorrect = answer === correctAnswer;
    
    setTimeout(() => {
      onAnswer(isCorrect);
      setSelectedAnswer(null);
      setShowResult(false);
    }, 1200);
  };

  const handleSpeak = (text: string, lang: string) => {
    if (isSpeaking) {
      stop();
    } else {
      speak(text, { lang });
    }
  };

  const getOptionStyle = (option: string) => {
    if (!showResult) {
      return 'bg-card hover:bg-muted border-2 border-border hover:border-primary';
    }
    
    if (option === correctAnswer) {
      return 'bg-primary/20 border-2 border-primary text-primary';
    }
    
    if (option === selectedAnswer && option !== correctAnswer) {
      return 'bg-destructive/20 border-2 border-destructive text-destructive';
    }
    
    return 'bg-card border-2 border-border opacity-50';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="relative rounded-2xl md:rounded-3xl shadow-elevated p-4 md:p-6 bg-card">
        {/* Box indicator */}
        <div
          className="absolute top-3 right-3 md:top-4 md:right-4 px-2.5 py-0.5 md:px-3 md:py-1 rounded-full text-xs md:text-sm font-medium"
          style={{
            backgroundColor: `hsl(var(--box-${word.boxNumber}) / 0.15)`,
            color: `hsl(var(--box-${word.boxNumber}))`,
          }}
        >
          {t('box')} {word.boxNumber}
        </div>

        {/* Language badges */}
        <div className="flex items-center gap-2 mb-3 md:mb-5">
          <span className="text-xl md:text-2xl">{getLanguageFlag(questionLang)}</span>
          <ArrowRight className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground" />
          <span className="text-xl md:text-2xl">{getLanguageFlag(answerLang)}</span>
        </div>

        {/* Question */}
        <div className="text-center mb-4 md:mb-6">
          <p className="text-xs md:text-sm text-muted-foreground mb-1 md:mb-2">
            {getLanguageName(questionLang)}
          </p>
          <div className="flex items-center justify-center gap-2 md:gap-3">
            <h2 className="font-display font-bold text-2xl md:text-3xl text-foreground break-all">
              {questionWord}
            </h2>
            {isSupported && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleSpeak(questionWord, questionLang)}
                className={`rounded-full transition-all flex-shrink-0 h-8 w-8 md:h-10 md:w-10 ${isSpeaking ? 'text-primary animate-pulse' : 'text-muted-foreground hover:text-primary'}`}
              >
                {isSpeaking ? <VolumeX className="w-4 h-4 md:w-5 md:h-5" /> : <Volume2 className="w-4 h-4 md:w-5 md:h-5" />}
              </Button>
            )}
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-2 md:mt-3">
            To'g'ri tarjimani tanlang:
          </p>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 gap-2 md:gap-3">
          {options.map((option, index) => (
            <motion.button
              key={`${option}-${index}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08 }}
              onClick={() => handleSelectAnswer(option)}
              disabled={showResult}
              className={`p-3 md:p-4 rounded-xl font-medium text-left transition-all duration-200 flex items-center justify-between text-sm md:text-base ${getOptionStyle(option)}`}
            >
              <span>{option}</span>
              {showResult && option === correctAnswer && (
                <Check className="w-4 h-4 md:w-5 md:h-5 text-primary flex-shrink-0" />
              )}
              {showResult && option === selectedAnswer && option !== correctAnswer && (
                <X className="w-4 h-4 md:w-5 md:h-5 text-destructive flex-shrink-0" />
              )}
            </motion.button>
          ))}
        </div>

        {/* Result feedback */}
        {showResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 text-center"
          >
            {selectedAnswer === correctAnswer ? (
              <p className="text-primary font-semibold text-sm md:text-base">✓ To'g'ri!</p>
            ) : (
              <p className="text-destructive font-semibold text-sm md:text-base">✗ Noto'g'ri</p>
            )}
          </motion.div>
        )}
      </div>

      <div className="mt-3 text-center">
        <p className="text-xs md:text-sm text-muted-foreground">
          {word.timesReviewed} marta takrorlangan
        </p>
      </div>
    </motion.div>
  );
};

export default QuizCard;
