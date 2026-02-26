import React, { useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Eye, Volume2, VolumeX } from 'lucide-react';
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

  const questionWord = isReversed ? word.translated_word : word.original_word;
  const answerWord = isReversed ? word.original_word : word.translated_word;
  const questionLang = isReversed ? word.target_language : word.source_language;
  const answerLang = isReversed ? word.source_language : word.target_language;

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
        className={`relative rounded-2xl shadow-elevated transition-colors duration-300 cursor-grab active:cursor-grabbing ${
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

        {/* Leitner Box badge */}
        <div className="px-5 pt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getLanguageFlag(questionLang)}</span>
            <span className="text-muted-foreground">→</span>
            <span className="text-lg">{getLanguageFlag(answerLang)}</span>
          </div>
          <div
            className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
            style={{
              backgroundColor: `hsl(var(--box-${word.box_number}) / 0.15)`,
              color: `hsl(var(--box-${word.box_number}))`,
            }}
          >
            Box {word.box_number}
          </div>
        </div>

        {/* Question word - large centered */}
        <div className="px-5 py-8 text-center min-h-[180px] flex flex-col items-center justify-center">
          <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">
            {isFlipped ? t('translation') : getLanguageName(questionLang)}
          </p>
          
          <div className="flex items-center justify-center gap-3">
            <h2 className="font-display font-bold text-4xl text-foreground break-words min-w-0 text-center leading-tight">
              {isFlipped ? answerWord : questionWord}
            </h2>
          </div>

          {isSupported && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleSpeak(isFlipped ? answerWord : questionWord, isFlipped ? answerLang : questionLang)}
              className={`rounded-full mt-3 h-10 w-10 ${isSpeaking ? 'text-primary animate-pulse' : 'text-muted-foreground hover:text-primary'}`}
            >
              {isSpeaking ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </Button>
          )}

          {/* Mnemonic hint */}
          {isFlipped && word.mnemonic_hint && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-muted-foreground mt-3 italic"
            >
              💡 {word.mnemonic_hint}
            </motion.p>
          )}

          {/* Example sentences */}
          {isFlipped && (word.example_sentences || []).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 p-3 bg-muted/50 rounded-xl w-full"
            >
              <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">{t('examples')}</p>
              {(word.example_sentences || []).map((sentence, index) => (
                <p key={index} className="text-xs text-foreground/80 italic">• {sentence}</p>
              ))}
            </motion.div>
          )}
        </div>

        {/* Action buttons */}
        <div className="px-5 pb-5">
          <AnimatePresence mode="wait">
            {!isFlipped ? (
              <motion.div key="show" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Button
                  onClick={handleFlip}
                  variant="outline"
                  size="lg"
                  className="w-full h-12 text-base rounded-xl border-muted-foreground/20"
                >
                  <Eye className="w-5 h-5 mr-2" />
                  Tap to flip
                </Button>
              </motion.div>
            ) : (
              <motion.div key="answer" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {/* Swipe hint for mobile */}
                <p className="text-[10px] text-center text-muted-foreground mb-3 sm:hidden">
                  👈 {t('swipeHint')} 👉
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleAnswer(false)}
                    size="lg"
                    className="flex-1 h-12 text-base rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  >
                    Forgot
                  </Button>
                  <Button
                    onClick={() => handleAnswer(true)}
                    size="lg"
                    className="flex-1 h-12 text-base rounded-xl gradient-primary text-primary-foreground"
                  >
                    Knew it
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <div className="mt-3 text-center">
        <p className="text-xs text-muted-foreground">
          {word.times_reviewed} {t('reviewsToday').toLowerCase()}
        </p>
      </div>
    </motion.div>
  );
});

FlashCard.displayName = 'FlashCard';

export default FlashCard;
