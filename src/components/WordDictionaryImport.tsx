import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Check, Search, Filter, ChevronDown, Download, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface DictionaryWord {
  headword: string;
  pos: string;
  level: string;
  guideword?: string;
  topic?: string;
}

interface WordDictionaryImportProps {
  onImport: (words: { originalWord: string; translatedWord: string; exampleSentences: string[] }[]) => Promise<void>;
  targetLanguage: string; // en, ru, etc. - which language dictionary to show
}

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const LEVEL_COLORS: Record<string, string> = {
  'A1': 'bg-green-500',
  'A2': 'bg-green-600',
  'B1': 'bg-yellow-500',
  'B2': 'bg-orange-500',
  'C1': 'bg-red-500',
  'C2': 'bg-purple-500',
};

const WordDictionaryImport: React.FC<WordDictionaryImportProps> = ({ onImport, targetLanguage }) => {
  const [words, setWords] = useState<DictionaryWord[]>([]);
  const [filteredWords, setFilteredWords] = useState<DictionaryWord[]>([]);
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  // Dictionary config by language
  const DICTIONARY_CONFIG: Record<string, { file: string; name: string; available: boolean }> = {
    'en': { file: '/data/english-words.xlsx', name: 'EnglishProfile', available: true },
    'ru': { file: '/data/russian-words.xlsx', name: 'Русский словарь', available: false },
  };

  const dictConfig = DICTIONARY_CONFIG[targetLanguage] || { file: '', name: '', available: false };

  // Load and parse the Excel file
  useEffect(() => {
    if (!dictConfig.available) {
      setIsLoading(false);
      return;
    }

    const loadDictionary = async () => {
      try {
        // Dynamic import for better bundle splitting
        const XLSX = await import('xlsx');
        
        const response = await fetch(dictConfig.file);
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        const allWords: DictionaryWord[] = [];
        
        // Parse the main A1-C2 sheet which has proper structure
        const mainSheet = workbook.Sheets['A1-C2'];
        if (mainSheet) {
          const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(mainSheet);
          
          jsonData.forEach(row => {
            const headword = row['Base Word'] || row['Word'] || row['__EMPTY'];
            const level = row['Level'] || row['__EMPTY_1'] || row['__EMPTY_2'];
            
            const wordValue = typeof headword === 'string' ? headword.trim() : String(headword || '').trim();
            const levelValue = typeof level === 'string' ? level.toUpperCase().trim() : '';
            
            // Only include valid words with valid CEFR levels
            if (wordValue && wordValue.length > 0 && LEVELS.includes(levelValue)) {
              allWords.push({
                headword: wordValue,
                pos: '',
                level: levelValue,
                guideword: undefined,
                topic: undefined,
              });
            }
          });
        }
        
        // Also parse level-specific sheets (A1+, A2+, B1+, B2+, C1+)
        const levelSheets = ['A1+', 'A2+', 'B1+', 'B2+', 'C1+'];
        levelSheets.forEach(sheetName => {
          const sheet = workbook.Sheets[sheetName];
          if (sheet) {
            const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);
            
            jsonData.forEach(row => {
              const headword = row['Base Word'] || row['__EMPTY'] || Object.values(row)[0];
              const level = row['Level'] || row['__EMPTY_2'] || row['__EMPTY_1'];
              
              const wordValue = typeof headword === 'string' ? headword.trim() : String(headword || '').trim();
              let levelValue = typeof level === 'string' ? level.toUpperCase().trim() : '';
              
              // Extract level from sheet name if not in data
              if (!LEVELS.includes(levelValue)) {
                levelValue = sheetName.replace('+', '');
              }
              
              if (wordValue && wordValue.length > 0 && LEVELS.includes(levelValue)) {
                allWords.push({
                  headword: wordValue,
                  pos: '',
                  level: levelValue,
                  guideword: undefined,
                  topic: undefined,
                });
              }
            });
          }
        });
        
        console.log('Total words parsed:', allWords.length);
        
        // Remove duplicates by headword, keeping the first occurrence (usually lowest level)
        const uniqueWords = Array.from(
          new Map(allWords.map(w => [w.headword.toLowerCase(), w])).values()
        );
        
        console.log('Unique words:', uniqueWords.length);
        console.log('Level counts:', LEVELS.map(l => `${l}: ${uniqueWords.filter(w => w.level === l).length}`));
        
        setWords(uniqueWords);
        setFilteredWords(uniqueWords);
      } catch (error) {
        console.error('Failed to load dictionary:', error);
        toast.error("Lug'at yuklanmadi");
      } finally {
        setIsLoading(false);
      }
    };

    loadDictionary();
  }, [targetLanguage, dictConfig.available, dictConfig.file]);

  // Filter words based on search and level
  useEffect(() => {
    let filtered = words;
    
    if (searchTerm) {
      filtered = filtered.filter(w => 
        w.headword.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedLevel) {
      filtered = filtered.filter(w => w.level === selectedLevel);
    }
    
    setFilteredWords(filtered);
  }, [words, searchTerm, selectedLevel]);

  const toggleWord = (headword: string) => {
    const newSelected = new Set(selectedWords);
    if (newSelected.has(headword)) {
      newSelected.delete(headword);
    } else {
      newSelected.add(headword);
    }
    setSelectedWords(newSelected);
  };

  const selectAllFiltered = () => {
    const newSelected = new Set(selectedWords);
    filteredWords.forEach(w => newSelected.add(w.headword));
    setSelectedWords(newSelected);
  };

  const deselectAll = () => {
    setSelectedWords(new Set());
  };

  const selectByLevel = (level: string) => {
    const newSelected = new Set(selectedWords);
    words.filter(w => w.level === level).forEach(w => newSelected.add(w.headword));
    setSelectedWords(newSelected);
    toast.success(`${level} darajasidagi barcha so'zlar tanlandi`);
  };

  const handleImport = async () => {
    if (selectedWords.size === 0) {
      toast.error("Kamida bitta so'z tanlang");
      return;
    }

    setIsImporting(true);
    setImportProgress(0);

    try {
      const wordsToTranslate = words
        .filter(w => selectedWords.has(w.headword))
        .map(w => w.headword);

      setImportProgress(10);
      toast.info(`${wordsToTranslate.length} ta so'z tarjima qilinmoqda...`);

      // Call the translation edge function
      const { data, error } = await supabase.functions.invoke('translate-words', {
        body: { 
          words: wordsToTranslate,
          targetLanguage: 'uz' // O'zbek tiliga tarjima
        }
      });

      if (error) {
        console.error('Translation error:', error);
        throw new Error('Tarjima qilishda xatolik');
      }

      setImportProgress(70);

      const translations = data.translations as Array<{
        original: string;
        translation: string;
        examples: string[];
      }>;

      // Map translations to import format
      const wordsToImport = translations.map(t => ({
        originalWord: t.original,
        translatedWord: t.translation,
        exampleSentences: t.examples || [],
      }));

      setImportProgress(85);

      await onImport(wordsToImport);

      setImportProgress(100);

      toast.success(`${wordsToImport.length} ta so'z muvaffaqiyatli import qilindi!`);
      setSelectedWords(new Set());
    } catch (error) {
      console.error('Import error:', error);
      toast.error("Import qilishda xatolik yuz berdi");
    } finally {
      setIsImporting(false);
      setImportProgress(0);
    }
  };

  const getLevelCount = (level: string) => {
    return words.filter(w => w.level === level).length;
  };

  // Show message if dictionary not available for this language
  if (!dictConfig.available) {
    const languageNames: Record<string, string> = {
      'en': 'Ingliz',
      'ru': 'Rus',
      'uz': "O'zbek"
    };
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-12 gap-4 text-center"
      >
        <div className="p-4 rounded-full bg-muted">
          <BookOpen className="w-8 h-8 text-muted-foreground" />
        </div>
        <div>
          <h3 className="font-semibold text-lg mb-2">
            {languageNames[targetLanguage] || targetLanguage} tili lug'ati mavjud emas
          </h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Hozircha faqat ingliz tili uchun EnglishProfile lug'ati mavjud. 
            Rus tili lug'atini qo'shish uchun Excel faylini yuklashingiz mumkin.
          </p>
        </div>
      </motion.div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Lug'at yuklanmoqda...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl bg-primary/10">
          <BookOpen className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">{dictConfig.name} Lug'ati</h3>
          <p className="text-sm text-muted-foreground">
            {words.length} ta so'z (A1-C2)
          </p>
        </div>
      </div>

      {/* Level badges */}
      <div className="flex flex-wrap gap-2">
        {LEVELS.map(level => (
          <button
            key={level}
            onClick={() => setSelectedLevel(selectedLevel === level ? null : level)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              selectedLevel === level
                ? `${LEVEL_COLORS[level]} text-white`
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            {level} ({getLevelCount(level)})
          </button>
        ))}
      </div>

      {/* Search and actions */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="So'z qidirish..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <Filter className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={selectAllFiltered}>
              Barchasini tanlash ({filteredWords.length})
            </DropdownMenuItem>
            <DropdownMenuItem onClick={deselectAll}>
              Tanlovni bekor qilish
            </DropdownMenuItem>
            {LEVELS.map(level => (
              <DropdownMenuItem key={level} onClick={() => selectByLevel(level)}>
                {level} darajani tanlash
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Word list */}
      <ScrollArea className="h-[300px] rounded-xl border">
        <div className="p-2 space-y-1">
          {filteredWords.slice(0, 200).map((word) => (
            <div
              key={word.headword}
              onClick={() => toggleWord(word.headword)}
              className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                selectedWords.has(word.headword)
                  ? 'bg-primary/10 border border-primary/20'
                  : 'hover:bg-muted'
              }`}
            >
              <Checkbox checked={selectedWords.has(word.headword)} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{word.headword}</span>
                  {word.pos && (
                    <span className="text-xs text-muted-foreground">({word.pos})</span>
                  )}
                </div>
                {word.guideword && (
                  <p className="text-xs text-muted-foreground truncate">{word.guideword}</p>
                )}
              </div>
              <Badge className={`${LEVEL_COLORS[word.level]} text-white text-xs`}>
                {word.level}
              </Badge>
            </div>
          ))}
          {filteredWords.length > 200 && (
            <p className="text-center text-sm text-muted-foreground py-4">
              ...va yana {filteredWords.length - 200} ta so'z
            </p>
          )}
        </div>
      </ScrollArea>

      {/* Import progress */}
      <AnimatePresence>
        {isImporting && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Import qilinmoqda...</span>
              <span className="font-medium text-primary">{importProgress}%</span>
            </div>
            <Progress value={importProgress} className="h-2" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import button */}
      <Button
        onClick={handleImport}
        disabled={selectedWords.size === 0 || isImporting}
        className="w-full gap-2 gradient-primary text-primary-foreground"
      >
        {isImporting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {`ChatGPT tarjima qilmoqda... ${importProgress}%`}
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            {`${selectedWords.size} ta so'zni tarjima qilish (ChatGPT)`}
          </>
        )}
      </Button>

      {/* Info */}
      <p className="text-xs text-center text-muted-foreground">
        ChatGPT orqali avtomatik tarjima va misol gaplar
      </p>
    </motion.div>
  );
};

export default WordDictionaryImport;
