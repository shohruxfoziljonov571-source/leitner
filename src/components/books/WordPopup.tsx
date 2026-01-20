import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Volume2, X, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWordsDB } from '@/hooks/useWordsDB';
import { useLearningLanguage } from '@/contexts/LearningLanguageContext';
import { useSpeech } from '@/hooks/useSpeech';
import { toast } from 'sonner';

interface WordPopupProps {
  word: string;
  language: string;
  children: React.ReactNode;
  isSelected: boolean;
  onWordClick: (word: string) => void;
}

const WordPopup: React.FC<WordPopupProps> = ({
  word,
  language,
  children,
  isSelected,
  onWordClick,
}) => {
  const [open, setOpen] = useState(false);
  const [translation, setTranslation] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded] = useState(false);
  
  const { addWord } = useWordsDB();
  const { activeLanguage } = useLearningLanguage();
  const { speak } = useSpeech();

  const cleanWord = word.replace(/[.,!?;:'"()[\]{}]/g, '').trim();

  const handleSpeak = () => {
    speak(cleanWord, { lang: language, rate: 0.7 });
    onWordClick(cleanWord);
  };

  const handleAddWord = async () => {
    if (!translation.trim() || !activeLanguage) {
      toast.error('Tarjimani kiriting');
      return;
    }

    setIsAdding(true);
    try {
      const result = await addWord({
        original_word: cleanWord,
        translated_word: translation.trim(),
        source_language: activeLanguage.target_language,
        target_language: activeLanguage.source_language,
      });

      if (result && 'error' in result && result.error === 'duplicate') {
        toast.error('Bu so\'z allaqachon mavjud');
      } else if (result) {
        toast.success('So\'z lug\'atga qo\'shildi!');
        setAdded(true);
        setTimeout(() => setOpen(false), 1000);
      }
    } catch (error) {
      toast.error('Xatolik yuz berdi');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span
          className={`cursor-pointer hover:bg-primary/10 rounded px-0.5 transition-colors ${
            isSelected ? 'bg-primary/20' : ''
          }`}
          onClick={handleSpeak}
        >
          {children}
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" side="top">
        <AnimatePresence mode="wait">
          {added ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center py-4"
            >
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-2">
                <Check className="w-6 h-6 text-green-500" />
              </div>
              <p className="font-medium text-green-500">Qo'shildi!</p>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-lg">{cleanWord}</h4>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => speak(cleanWord, { lang: language, rate: 0.7 })}
                >
                  <Volume2 className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="translation" className="text-sm">
                    Tarjimasi
                  </Label>
                  <Input
                    id="translation"
                    placeholder="Tarjimani kiriting..."
                    value={translation}
                    onChange={(e) => setTranslation(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddWord()}
                    autoFocus
                  />
                </div>
                
                <Button
                  className="w-full gap-2"
                  onClick={handleAddWord}
                  disabled={isAdding || !translation.trim()}
                >
                  {isAdding ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Lug'atga qo'shish
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </PopoverContent>
    </Popover>
  );
};

export default WordPopup;
