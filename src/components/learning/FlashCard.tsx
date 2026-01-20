import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Check, X, ArrowRight, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSpeech } from '@/hooks/useSpeech';
import { Word } from '@/types/word';
import { getLanguageName, getLanguageFlag } from '@/lib/languages';

interface FlashCardProps {
  word: Word;
  onAnswer: (isCorrect: boolean) => void;
  isReversed?: boolean;
}

const FlashCard: React.FC<FlashCardProps> = ({ word, onAnswer, isReversed = false }) => {
  const { t } = useLanguage();
  const [isFlipped, setIsFlipped] = useState(false);
  const [answered, setAnswered] = useState<boolean | null>(null);
  const { speak, isSpeaking, isSupported, stop } = useSpeech();

  const questionWord = isReversed ? word.translatedWord : word.originalWord;
  const answerWord = isReversed ? word.originalWord : word.translatedWord;
  const questionLang = isReversed ? word.targetLanguage : word.sourceLanguage;
  const answerLang = isReversed ? word.sourceLanguage : word.targetLanguage;

  const handleFlip = () => {
    if (!isFlipped) {
      setIsFlipped(true);
    }
  };

  const handleAnswer = (isCorrect: boolean) => {
    setAnswered(isCorrect);
    setTimeout(() => {
      onAnswer(isCorrect);
      setIsFlipped(false);
      setAnswered(null);
    }, 500);
  };

  const handleSpeak = (text: string, lang: string) => {
    if (isSpeaking) {
      stop();
    } else {
      speak(text, { lang });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-md mx-auto"
    >
      <div
        className={`relative min-h-[320px] rounded-3xl shadow-elevated p-6 transition-all duration-300 ${
          answered === true
            ? 'bg-primary/10 ring-2 ring-primary'
            : answered === false
            ? 'bg-destructive/10 ring-2 ring-destructive'
            : 'bg-card'
        }`}
      >
        <div
          className="absolute top-4 right-4 px-3 py-1 rounded-full text-sm font-medium"
          style={{
            backgroundColor: `hsl(var(--box-${word.boxNumber}) / 0.15)`,
            color: `hsl(var(--box-${word.boxNumber}))`,
          }}
        >
          {t('box')} {word.boxNumber}
        </div>

        <div className="flex items-center gap-2 mb-6">
          <span className="text-2xl">{getLanguageFlag(questionLang)}</span>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          <span className="text-2xl">{getLanguageFlag(answerLang)}</span>
        </div>

        <div className="text-center mb-8">
          <p className="text-sm text-muted-foreground mb-2">
            {getLanguageName(questionLang)}
          </p>
          <div className="flex items-center justify-center gap-3">
            <h2 className="font-display font-bold text-3xl text-foreground">
              {questionWord}
            </h2>
            {isSupported && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleSpeak(questionWord, questionLang)}
                className={`rounded-full transition-all ${isSpeaking ? 'text-primary animate-pulse' : 'text-muted-foreground hover:text-primary'}`}
              >
                {isSpeaking ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </Button>
            )}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {!isFlipped ? (
            <motion.div
              key="hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <Button
                onClick={handleFlip}
                size="lg"
                className="gap-2 gradient-primary text-primary-foreground"
              >
                <Eye className="w-5 h-5" />
                {t('showAnswer')}
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="revealed"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="text-center mb-6">
                <p className="text-sm text-muted-foreground mb-2">{t('translation')}</p>
                <div className="flex items-center justify-center gap-3">
                  <p className="font-display font-semibold text-2xl text-primary">
                    {answerWord}
                  </p>
                  {isSupported && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleSpeak(answerWord, answerLang)}
                      className={`rounded-full transition-all ${isSpeaking ? 'text-primary animate-pulse' : 'text-muted-foreground hover:text-primary'}`}
                    >
                      {isSpeaking ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </Button>
                  )}
                </div>
              </div>

              {word.exampleSentences.length > 0 && (
                <div className="mb-6 p-4 bg-muted/50 rounded-xl">
                  <p className="text-sm text-muted-foreground mb-2">{t('examples')}</p>
                  {word.exampleSentences.map((sentence, index) => (
                    <p key={index} className="text-sm text-foreground italic">
                      • {sentence}
                    </p>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={() => handleAnswer(false)}
                  variant="outline"
                  size="lg"
                  className="flex-1 gap-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  <X className="w-5 h-5" />
                  {t('incorrect')}
                </Button>
                <Button
                  onClick={() => handleAnswer(true)}
                  size="lg"
                  className="flex-1 gap-2 bg-primary hover:bg-primary/90"
                >
                  <Check className="w-5 h-5" />
                  {t('correct')}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-4 text-center">
        <p className="text-sm text-muted-foreground">
          {word.timesReviewed} {t('reviewsToday').toLowerCase()}
        </p>
      </div>
    </motion.div>
  );
};

export default FlashCard;
