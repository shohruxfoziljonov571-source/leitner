import React, { useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
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

const FlashCard = React.forwardRef<HTMLDivElement, FlashCardProps>(({ word, onAnswer, isReversed = false }, ref) => {
  const { t } = useLanguage();
  const [isFlipped, setIsFlipped] = useState(false);
  const [answered, setAnswered] = useState<boolean | null>(null);
  const { speak, isSpeaking, isSupported, stop } = useSpeech();

  const questionWord = isReversed ? word.translatedWord : word.originalWord;
  const answerWord = isReversed ? word.originalWord : word.translatedWord;
  const questionLang = isReversed ? word.targetLanguage : word.sourceLanguage;
  const answerLang = isReversed ? word.sourceLanguage : word.targetLanguage;

  // Swipe gesture
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const correctOpacity = useTransform(x, [0, 80], [0, 1]);
  const incorrectOpacity = useTransform(x, [-80, 0], [1, 0]);
  const bgColor = useTransform(
    x,
    [-100, 0, 100],
    ['hsl(0 84% 60% / 0.15)', 'hsl(0 0% 100% / 0)', 'hsl(142 71% 45% / 0.15)']
  );

  const handleFlip = () => {
    if (!isFlipped) setIsFlipped(true);
  };

  const handleAnswer = (isCorrect: boolean) => {
    setAnswered(isCorrect);
    setTimeout(() => {
      onAnswer(isCorrect);
      setIsFlipped(false);
      setAnswered(null);
    }, 500);
  };

  const handleDragEnd = (_: any, info: { offset: { x: number }; velocity: { x: number } }) => {
    if (!isFlipped) return;
    const threshold = 80;
    const velocityThreshold = 300;
    if (info.offset.x > threshold || info.velocity.x > velocityThreshold) {
      handleAnswer(true);
    } else if (info.offset.x < -threshold || info.velocity.x < -velocityThreshold) {
      handleAnswer(false);
    }
  };

  const handleSpeak = (text: string, lang: string) => {
    if (isSpeaking) stop();
    else speak(text, { lang });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-lg mx-auto"
    >
      <motion.div
        style={{ x, rotate, backgroundColor: isFlipped ? bgColor : undefined }}
        drag={isFlipped ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.7}
        onDragEnd={handleDragEnd}
        className={`relative rounded-2xl shadow-elevated p-4 transition-colors duration-300 cursor-grab active:cursor-grabbing ${
          answered === true
            ? 'bg-primary/10 ring-2 ring-primary'
            : answered === false
            ? 'bg-destructive/10 ring-2 ring-destructive'
            : 'bg-card'
        }`}
      >
        {/* Swipe indicators */}
        {isFlipped && (
          <>
            <motion.div
              style={{ opacity: correctOpacity }}
              className="absolute top-4 left-4 px-3 py-1 rounded-full bg-primary/20 text-primary font-bold text-sm border-2 border-primary pointer-events-none z-10"
            >
              {t('correct')} ✓
            </motion.div>
            <motion.div
              style={{ opacity: incorrectOpacity }}
              className="absolute top-4 right-4 px-3 py-1 rounded-full bg-destructive/20 text-destructive font-bold text-sm border-2 border-destructive pointer-events-none z-10"
            >
              {t('incorrect')} ✗
            </motion.div>
          </>
        )}

        <div
          className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-medium"
          style={{
            backgroundColor: `hsl(var(--box-${word.boxNumber}) / 0.15)`,
            color: `hsl(var(--box-${word.boxNumber}))`,
          }}
        >
          {t('box')} {word.boxNumber}
        </div>

        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">{getLanguageFlag(questionLang)}</span>
          <ArrowRight className="w-3 h-3 text-muted-foreground" />
          <span className="text-xl">{getLanguageFlag(answerLang)}</span>
        </div>

        <div className="text-center mb-5">
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
                onClick={() => handleSpeak(questionWord, questionLang)}
                className={`rounded-full transition-all flex-shrink-0 h-9 w-9 ${isSpeaking ? 'text-primary animate-pulse' : 'text-muted-foreground hover:text-primary'}`}
              >
                {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
            )}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {!isFlipped ? (
            <motion.div key="hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Button
                onClick={handleFlip}
                size="lg"
                className="gap-2 gradient-primary text-primary-foreground w-full h-12 text-base"
              >
                <Eye className="w-5 h-5" />
                {t('showAnswer')}
              </Button>
            </motion.div>
          ) : (
            <motion.div key="revealed" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="text-center mb-4">
                <p className="text-xs text-muted-foreground mb-1.5">{t('translation')}</p>
                <div className="flex items-center justify-center gap-2">
                  <p className="font-display font-semibold text-xl text-primary break-words min-w-0 flex-1 text-center">
                    {answerWord}
                  </p>
                  {isSupported && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleSpeak(answerWord, answerLang)}
                      className={`rounded-full transition-all flex-shrink-0 h-9 w-9 ${isSpeaking ? 'text-primary animate-pulse' : 'text-muted-foreground hover:text-primary'}`}
                    >
                      {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </Button>
                  )}
                </div>
              </div>

              {word.exampleSentences.length > 0 && (
                <div className="mb-4 p-3 bg-muted/50 rounded-xl">
                  <p className="text-xs text-muted-foreground mb-1">{t('examples')}</p>
                  {word.exampleSentences.map((sentence, index) => (
                    <p key={index} className="text-xs text-foreground italic">• {sentence}</p>
                  ))}
                </div>
              )}

              {/* Swipe hint for mobile */}
              <p className="text-[10px] text-center text-muted-foreground mb-3 sm:hidden">
                👈 {t('swipeHint')} 👉
              </p>

              <div className="flex gap-2">
                <Button
                  onClick={() => handleAnswer(false)}
                  variant="outline"
                  size="lg"
                  className="flex-1 gap-1.5 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground h-12 text-sm"
                >
                  <X className="w-4 h-4" />
                  {t('incorrect')}
                </Button>
                <Button
                  onClick={() => handleAnswer(true)}
                  size="lg"
                  className="flex-1 gap-1.5 bg-primary hover:bg-primary/90 h-12 text-sm"
                >
                  <Check className="w-4 h-4" />
                  {t('correct')}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <div className="mt-3 text-center">
        <p className="text-xs text-muted-foreground">
          {word.timesReviewed} {t('reviewsToday').toLowerCase()}
        </p>
      </div>
    </motion.div>
  );
});

FlashCard.displayName = 'FlashCard';

export default FlashCard;
