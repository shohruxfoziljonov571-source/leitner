import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Languages, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import CategorySelect from '@/components/CategorySelect';

const languageFlags: Record<string, string> = {
  uz: '🇺🇿',
  ru: '🇷🇺',
  en: '🇬🇧',
};

const languageNames: Record<string, Record<string, string>> = {
  uz: { uz: "O'zbekcha", ru: 'Узбекский', en: 'Uzbek' },
  ru: { uz: 'Ruscha', ru: 'Русский', en: 'Russian' },
  en: { uz: 'Inglizcha', ru: 'Английский', en: 'English' },
};

interface AddWordFormProps {
  sourceLanguage: string;
  targetLanguage: string;
  onAddWord: (word: {
    originalWord: string;
    translatedWord: string;
    sourceLanguage: string;
    targetLanguage: string;
    exampleSentences: string[];
    categoryId?: string | null;
  }) => Promise<void>;
}

const AddWordForm: React.FC<AddWordFormProps> = ({ 
  sourceLanguage, 
  targetLanguage, 
  onAddWord 
}) => {
  const { t, language } = useLanguage();
  const [originalWord, setOriginalWord] = useState('');
  const [translatedWord, setTranslatedWord] = useState('');
  const [examples, setExamples] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!originalWord.trim() || !translatedWord.trim()) {
      toast.error('Iltimos, barcha maydonlarni to\'ldiring');
      return;
    }

    setIsSubmitting(true);

    try {
      const exampleSentences = examples
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      await onAddWord({
        originalWord: originalWord.trim(),
        translatedWord: translatedWord.trim(),
        sourceLanguage,
        targetLanguage,
        exampleSentences,
        categoryId,
      });

      // Reset form
      setOriginalWord('');
      setTranslatedWord('');
      setExamples('');

      toast.success(t('wordAdded'));
    } catch (error) {
      toast.error('Xatolik yuz berdi');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      {/* Language Direction */}
      <div className="flex items-center justify-center gap-3 p-4 bg-muted rounded-xl">
        <span className="text-2xl">{languageFlags[sourceLanguage]}</span>
        <span className="font-medium">{languageNames[sourceLanguage][language]}</span>
        <span className="text-muted-foreground">→</span>
        <span className="text-2xl">{languageFlags[targetLanguage]}</span>
        <span className="font-medium">{languageNames[targetLanguage][language]}</span>
      </div>

      {/* Word Input */}
      <div className="space-y-2">
        <Label htmlFor="originalWord" className="text-sm font-medium">
          {t('enterWord')} ({languageNames[sourceLanguage][language]})
        </Label>
        <div className="relative">
          <Input
            id="originalWord"
            value={originalWord}
            onChange={(e) => setOriginalWord(e.target.value)}
            placeholder={sourceLanguage === 'en' ? 'Hello' : sourceLanguage === 'ru' ? 'Привет' : 'Salom'}
            className="bg-background text-lg h-12"
          />
          <Languages className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        </div>
      </div>

      {/* Translation Input */}
      <div className="space-y-2">
        <Label htmlFor="translatedWord" className="text-sm font-medium">
          {t('translation')} ({languageNames[targetLanguage][language]})
        </Label>
        <Input
          id="translatedWord"
          value={translatedWord}
          onChange={(e) => setTranslatedWord(e.target.value)}
          placeholder={targetLanguage === 'uz' ? 'Salom' : targetLanguage === 'ru' ? 'Привет' : 'Hello'}
          className="bg-background text-lg h-12"
        />
      </div>

      {/* Category Select */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Kategoriya (ixtiyoriy)
        </Label>
        <CategorySelect value={categoryId} onChange={setCategoryId} />
      </div>

      {/* Examples */}
      <div className="space-y-2">
        <Label htmlFor="examples" className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent" />
          {t('examples')} (ixtiyoriy)
        </Label>
        <Textarea
          id="examples"
          value={examples}
          onChange={(e) => setExamples(e.target.value)}
          placeholder="Har bir misolni yangi qatorga yozing..."
          className="bg-background min-h-[100px]"
        />
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting}
        className="w-full gap-2 gradient-primary text-primary-foreground h-12"
      >
        <Plus className="w-5 h-5" />
        {isSubmitting ? 'Qo\'shilmoqda...' : t('add')}
      </Button>
    </motion.form>
  );
};

export default AddWordForm;
