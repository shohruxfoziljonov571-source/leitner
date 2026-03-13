import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Plus, Search, FileSpreadsheet, BookOpen, Package } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLearningLanguage } from '@/contexts/LearningLanguageContext';
import { useWordsDB } from '@/hooks/useWordsDB';
import { useGamificationContext } from '@/contexts/GamificationContext';
import { usePremium } from '@/contexts/PremiumContext';
import AddWordForm from '@/components/AddWordForm';
import ExcelImport from '@/components/ExcelImport';
import WordList from '@/components/WordList';
import LanguageSelector from '@/components/LanguageSelector';
import UpgradePrompt from '@/components/premium/UpgradePrompt';
import { PremiumLock } from '@/components/premium/UpgradePrompt';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import WordExport from '@/components/WordExport';
import WordPackSelector from '@/components/WordPackSelector';

const AddWord: React.FC = () => {
  const { t } = useLanguage();
  const { activeLanguage } = useLearningLanguage();
  const { addWord, addWordsBulk, words, stats } = useWordsDB();
  const { checkAndUnlockAchievements, level } = useGamificationContext();
  const { isPremium, checkFeature } = usePremium();
  const [activeTab, setActiveTab] = useState('list');
  const [showUpgrade, setShowUpgrade] = useState(false);

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

    if (result && 'error' in result && result.error === 'duplicate') {
      throw new Error(`"${result.existingWord}" so'zi allaqachon mavjud!`);
    }

    if (!result) {
      throw new Error('Xatolik yuz berdi');
    }

    await checkAndUnlockAchievements({
      totalWords: words.length + 1,
      streak: stats.streak,
      level,
    });
  };

  const handleBulkImport = async (wordsToImport: { originalWord: string; translatedWord: string; exampleSentences: string[] }[]) => {
    if (!activeLanguage) return;

    if (!checkFeature('hasExcelImport')) {
      setShowUpgrade(true);
      return;
    }

    try {
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
        toast.warning(`Barcha ${duplicateCount} ta so'z allaqachon mavjud`);
      } else if (duplicateCount > 0) {
        toast.warning(`${addedCount} ta qo'shildi, ${duplicateCount} ta takroriy`);
      }

      if (addedCount > 0) {
        await checkAndUnlockAchievements({
          totalWords: words.length + addedCount,
          streak: stats.streak,
          level,
        });
      }
    } catch (error: any) {
      toast.error(error?.message || 'Import xatoligi');
      throw error;
    }
  };

  // Count mastered words (box 4-5)
  const masteredWords = words.filter(w => w.box_number >= 4).length;

  if (!activeLanguage) {
    return (
      <div className="min-h-screen pb-24 md:pt-24 md:pb-8">
        <div className="container mx-auto px-4 py-6 max-w-md">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 text-center"
          >
            <h1 className="font-display font-bold text-2xl text-foreground mb-2">
              Kutubxona 📚
            </h1>
            <p className="text-muted-foreground text-sm mb-6">
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

  const handleExcelTabClick = () => {
    if (!checkFeature('hasExcelImport')) {
      setShowUpgrade(true);
      return;
    }
    setActiveTab('import');
  };

  return (
    <div className="min-h-screen pb-24 md:pt-24 md:pb-8">
      <div className="container mx-auto px-4 py-5 max-w-lg">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5"
        >
          <h1 className="font-display font-bold text-xl text-foreground mb-1">
            Kutubxona
          </h1>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 gap-3 mb-5"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Jami so'zlar</p>
              <div className="flex items-baseline gap-1.5">
                <span className="font-display font-bold text-2xl text-foreground">{words.length.toLocaleString()}</span>
                <span className="text-xs text-primary">+{stats.today_reviewed} bugun</span>
              </div>
            </div>
            <WordExport />
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4 h-11 bg-muted rounded-xl p-1">
              <TabsTrigger value="list" className="gap-1.5 text-xs rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
                <BookOpen className="w-3.5 h-3.5" />
                So'zlar
              </TabsTrigger>
              <TabsTrigger value="manual" className="gap-1.5 text-xs rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
                <Plus className="w-3.5 h-3.5" />
                Qo'shish
              </TabsTrigger>
              <TabsTrigger 
                value="import" 
                className="gap-1.5 text-xs rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm"
                onClick={(e) => {
                  if (!checkFeature('hasExcelImport')) {
                    e.preventDefault();
                    setShowUpgrade(true);
                  }
                }}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Excel
                {!isPremium && <PremiumLock />}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="list">
              <WordList />
            </TabsContent>

            <TabsContent value="manual">
              <div className="bg-card rounded-2xl shadow-card p-5">
                <AddWordForm
                  sourceLanguage={activeLanguage.source_language}
                  targetLanguage={activeLanguage.target_language}
                  onAddWord={handleAddWord}
                />
              </div>
            </TabsContent>

            <TabsContent value="import">
              <div className="bg-card rounded-2xl shadow-card p-5">
                <ExcelImport
                  sourceLanguage={activeLanguage.source_language}
                  targetLanguage={activeLanguage.target_language}
                  onImport={handleBulkImport}
                />
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      {/* FAB for quick add */}
      {activeTab === 'list' && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={() => setActiveTab('manual')}
          className="fixed bottom-20 right-4 md:bottom-8 w-14 h-14 rounded-full gradient-primary text-primary-foreground shadow-elevated flex items-center justify-center z-fixed"
        >
          <Plus className="w-6 h-6" />
        </motion.button>
      )}

      <UpgradePrompt
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        feature="Excel import"
        description="Excel orqali so'z qo'shish faqat Premium foydalanuvchilari uchun. Premium olsangiz — cheksiz import!"
      />
    </div>
  );
};

export default AddWord;
