import React, { useState } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLearningLanguage } from '@/contexts/LearningLanguageContext';
import { useWordsDB } from '@/hooks/useWordsDB';
import { useGamificationContext } from '@/contexts/GamificationContext';
import AddWordForm from '@/components/AddWordForm';
import ExcelImport from '@/components/ExcelImport';
import WordList from '@/components/WordList';
import LanguageSelector from '@/components/LanguageSelector';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PenLine, FileSpreadsheet, List } from 'lucide-react';

const AddWord: React.FC = () => {
  const { t } = useLanguage();
  const { activeLanguage } = useLearningLanguage();
  const { addWord, addWordsBulk, words, stats } = useWordsDB();
  const { checkAndUnlockAchievements, level } = useGamificationContext();
  const [activeTab, setActiveTab] = useState('manual');

  const handleAddWord = async (word: {
    originalWord: string;
    translatedWord: string;
    sourceLanguage: string;
    targetLanguage: string;
    exampleSentences: string[];
    categoryId?: string | null;
  }) => {
    const result = await addWord({
      original_word: word.originalWord,
      translated_word: word.translatedWord,
      source_language: word.sourceLanguage,
      target_language: word.targetLanguage,
      example_sentences: word.exampleSentences,
      category_id: word.categoryId,
    });

    // Check if duplicate
    if (result && 'error' in result && result.error === 'duplicate') {
      throw new Error(`"${result.existingWord}" so'zi allaqachon mavjud!`);
    }

    if (!result) {
      throw new Error('Xatolik yuz berdi');
    }

    // Check achievements
    await checkAndUnlockAchievements({
      totalWords: words.length + 1,
      streak: stats.streak,
      level,
    });
  };

  const handleBulkImport = async (wordsToImport: { originalWord: string; translatedWord: string; exampleSentences: string[] }[]) => {
    if (!activeLanguage) return;
    
    try {
      // Use bulk insert with chunking — handles large Excel files safely
      const result = await addWordsBulk(wordsToImport.map(word => ({
        original_word: word.originalWord,
        translated_word: word.translatedWord,
        source_language: activeLanguage.source_language,
        target_language: activeLanguage.target_language,
        example_sentences: word.exampleSentences,
      })));

      const addedCount = result.added.length;
      const duplicateCount = result.duplicates.length;

      if (addedCount === 0 && duplicateCount > 0) {
        toast.warning(`Barcha ${duplicateCount} ta so'z allaqachon mavjud — takroriylar o'tkazib yuborildi`);
      } else if (duplicateCount > 0) {
        toast.warning(`${addedCount} ta so'z qo'shildi, ${duplicateCount} ta takroriy so'z o'tkazib yuborildi`);
      }

      if (addedCount > 0) {
        await checkAndUnlockAchievements({
          totalWords: words.length + addedCount,
          streak: stats.streak,
          level,
        });
      }
    } catch (error: any) {
      toast.error(error?.message || 'Import qilishda xatolik yuz berdi');
      throw error; // re-throw so ExcelImport shows error state
    }
  };

  if (!activeLanguage) {
    return (
      <div className="min-h-screen pb-24 md:pt-24 md:pb-8">
        <div className="container mx-auto px-4 py-6 max-w-md">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 text-center"
          >
            <h1 className="font-display font-bold text-3xl text-foreground mb-2">
              {t('addWord')} ✨
            </h1>
            <p className="text-muted-foreground mb-6">
              Avval o'rganish tilini tanlang
            </p>
          </motion.div>
          <LanguageSelector />
          <Link to="/" className="block mt-4">
            <Button variant="outline" className="w-full">Bosh sahifaga</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 md:pt-24 md:pb-8">
      <div className="container mx-auto px-4 py-6 max-w-lg">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <h1 className="font-display font-bold text-3xl text-foreground mb-2">
            {t('addWord')} ✨
          </h1>
          <p className="text-muted-foreground">
            Yangi so'z qo'shing va o'rganishni boshlang
          </p>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6 h-12">
              <TabsTrigger value="manual" className="gap-1.5 h-10">
                <PenLine className="w-4 h-4" />
                <span>Qo'lda</span>
              </TabsTrigger>
              <TabsTrigger value="import" className="gap-1.5 h-10">
                <FileSpreadsheet className="w-4 h-4" />
                <span>Excel</span>
              </TabsTrigger>
              <TabsTrigger value="list" className="gap-1.5 h-10">
                <List className="w-4 h-4" />
                <span>Ro'yxat</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="manual">
              <div className="bg-card rounded-3xl shadow-card p-6">
                <AddWordForm
                  sourceLanguage={activeLanguage.source_language}
                  targetLanguage={activeLanguage.target_language}
                  onAddWord={handleAddWord}
                />
              </div>
            </TabsContent>

            <TabsContent value="import">
              <div className="bg-card rounded-3xl shadow-card p-6">
                <ExcelImport
                  sourceLanguage={activeLanguage.source_language}
                  targetLanguage={activeLanguage.target_language}
                  onImport={handleBulkImport}
                />
              </div>
            </TabsContent>

            <TabsContent value="list">
              <div className="bg-card rounded-3xl shadow-card p-6">
                <WordList />
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Tips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/10"
        >
          <h4 className="font-medium text-sm text-primary mb-2">
            {activeTab === 'manual' ? '💡 Maslahat' : '📋 Excel format'}
          </h4>
          <p className="text-sm text-muted-foreground">
            {activeTab === 'manual' 
              ? "So'zlar bilan birga misol gaplar qo'shing - bu yodda saqlashni osonlashtiradi!"
              : "Ustun A - asl so'z, Ustun B - tarjima, Ustun C - misollar (nuqtali vergul bilan ajrating)"}
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default AddWord;
