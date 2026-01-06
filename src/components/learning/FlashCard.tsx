import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Check, X, ArrowRight, Volume2, VolumeX, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSpeech } from '@/hooks/useSpeech';
import { Word } from '@/types/word';

interface FlashCardProps {
  word: Word;
  onAnswer: (isCorrect: boolean) => void;
  isReversed?: boolean; // If true, show translation first and ask for original
}

const languageNames: Record<string, string> = {
  uz: "O'zbekcha",
  ru: 'Русский',
  en: 'English',
};

const languageFlags: Record<string, string> = {
  uz: '🇺🇿',
  ru: '🇷🇺',
  en: '🇬🇧',
};

const FlashCard: React.FC<FlashCardProps> = ({ word, onAnswer, isReversed = false }) => {
  const { t } = useLanguage();
  const [isFlipped, setIsFlipped] = useState(false);
  const [answered, setAnswered] = useState<boolean | null>(null);
  const { speak, isSpeaking, isSupported, stop } = useSpeech();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

  // Determine which word to show as question and which as answer
  const questionWord = isReversed ? word.translatedWord : word.originalWord;
  const answerWord = isReversed ? word.originalWord : word.translatedWord;
  const questionLang = isReversed ? word.targetLanguage : word.sourceLanguage;
  const answerLang = isReversed ? word.sourceLanguage : word.targetLanguage;

  // Fetch image when answer is revealed
  useEffect(() => {
    if (isFlipped && !imageUrl && !imageLoading) {
      fetchWordImage();
    }
  }, [isFlipped]);

  const fetchWordImage = async () => {
    setImageLoading(true);
    try {
      // Use the original word (foreign language) for better image results
      const searchWord = word.originalWord;
      // Using a free image API - Unsplash
      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchWord)}&per_page=1&client_id=demo`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          setImageUrl(data.results[0].urls.small);
        }
      }
    } catch (error) {
      console.log('Image fetch failed, using fallback');
      // Fallback: use a placeholder image service
      setImageUrl(`https://source.unsplash.com/200x150/?${encodeURIComponent(word.originalWord)}`);
    } finally {
      setImageLoading(false);
    }
  };

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
      setImageUrl(null);
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
      {/* Card */}
      <div
        className={`relative min-h-[320px] rounded-3xl shadow-elevated p-6 transition-all duration-300 ${
          answered === true
            ? 'bg-primary/10 ring-2 ring-primary'
            : answered === false
            ? 'bg-destructive/10 ring-2 ring-destructive'
            : 'bg-card'
        }`}
      >
        {/* Box indicator */}
        <div
          className="absolute top-4 right-4 px-3 py-1 rounded-full text-sm font-medium"
          style={{
            backgroundColor: `hsl(var(--box-${word.boxNumber}) / 0.15)`,
            color: `hsl(var(--box-${word.boxNumber}))`,
          }}
        >
          {t('box')} {word.boxNumber}
        </div>

        {/* Language badges - show direction based on isReversed */}
        <div className="flex items-center gap-2 mb-6">
          <span className="text-2xl">{languageFlags[questionLang]}</span>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          <span className="text-2xl">{languageFlags[answerLang]}</span>
        </div>

        {/* Question word with speaker */}
        <div className="text-center mb-8">
          <p className="text-sm text-muted-foreground mb-2">
            {languageNames[questionLang]}
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

        {/* Answer area */}
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
              {/* Image for the word */}
              {(imageUrl || imageLoading) && (
                <div className="mb-4 flex justify-center">
                  {imageLoading ? (
                    <div className="w-32 h-24 bg-muted rounded-xl flex items-center justify-center animate-pulse">
                      <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    </div>
                  ) : imageUrl ? (
                    <motion.img
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      src={imageUrl}
                      alt={word.originalWord}
                      className="w-32 h-24 object-cover rounded-xl shadow-md"
                      onError={() => setImageUrl(null)}
                    />
                  ) : null}
                </div>
              )}

              {/* Answer word with speaker */}
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

              {/* Examples */}
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

              {/* Answer buttons */}
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

      {/* Progress indicator */}
      <div className="mt-4 text-center">
        <p className="text-sm text-muted-foreground">
          {word.timesReviewed} {t('reviewsToday').toLowerCase()}
        </p>
      </div>
    </motion.div>
  );
};

export default FlashCard;
