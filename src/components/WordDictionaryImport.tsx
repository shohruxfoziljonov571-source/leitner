import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Check, Search, Filter, ChevronDown, Download, Loader2 } from 'lucide-react';
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
import * as XLSX from 'xlsx';

interface DictionaryWord {
  headword: string;
  pos: string;
  level: string;
  guideword?: string;
  topic?: string;
}

interface WordDictionaryImportProps {
  onImport: (words: { originalWord: string; translatedWord: string; exampleSentences: string[] }[]) => Promise<void>;
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

const WordDictionaryImport: React.FC<WordDictionaryImportProps> = ({ onImport }) => {
  const [words, setWords] = useState<DictionaryWord[]>([]);
  const [filteredWords, setFilteredWords] = useState<DictionaryWord[]>([]);
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  // Load and parse the Excel file
  useEffect(() => {
    const loadDictionary = async () => {
      try {
        const response = await fetch('/data/english-words.xlsx');
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        const allWords: DictionaryWord[] = [];
        
        console.log('Sheet names:', workbook.SheetNames);
        
        // Parse each sheet (each level has its own sheet)
        workbook.SheetNames.forEach(sheetName => {
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);
          
          console.log(`Sheet ${sheetName}: ${jsonData.length} rows`);
          if (jsonData.length > 0) {
            console.log('First row keys:', Object.keys(jsonData[0]));
            console.log('First row:', jsonData[0]);
          }
          
          jsonData.forEach(row => {
            // Try multiple column name variations
            const headword = row['headword'] || row['Headword'] || row['HEADWORD'] || 
                           row['word'] || row['Word'] || row['WORD'] || 
                           row['__EMPTY'] || Object.values(row)[0];
            const pos = row['pos'] || row['PoS'] || row['POS'] || row['Part of Speech'] || 
                       row['part_of_speech'] || '';
            const level = row['CEFR level'] || row['CEFR Level'] || row['level'] || 
                         row['Level'] || row['LEVEL'] || sheetName;
            const guideword = row['guideword'] || row['Guideword'] || row['Guide Word'] || 
                             row['definition'] || row['Definition'] || '';
            const topic = row['Topic (for verbs in the EVP)'] || row['topic'] || row['Topic'] || '';
            
            const wordValue = typeof headword === 'string' ? headword.trim() : String(headword || '').trim();
            
            if (wordValue && wordValue.length > 0 && !wordValue.startsWith('headword')) {
              allWords.push({
                headword: wordValue,
                pos: String(pos || '').trim(),
                level: String(level || 'A1').toUpperCase().trim(),
                guideword: guideword ? String(guideword).trim() : undefined,
                topic: topic ? String(topic).trim() : undefined,
              });
            }
          });
        });
        
        console.log('Total words parsed:', allWords.length);
        
        // Remove duplicates by headword
        const uniqueWords = Array.from(
          new Map(allWords.map(w => [w.headword.toLowerCase(), w])).values()
        );
        
        console.log('Unique words:', uniqueWords.length);
        
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
  }, []);

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
      const wordsToImport = words
        .filter(w => selectedWords.has(w.headword))
        .map(w => ({
          originalWord: w.headword,
          translatedWord: `[${w.level}] ${w.guideword || ''}`.trim() || w.headword,
          exampleSentences: w.topic ? [w.topic] : [],
        }));

      // Simulate progress
      const progressInterval = setInterval(() => {
        setImportProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      await onImport(wordsToImport);

      clearInterval(progressInterval);
      setImportProgress(100);

      toast.success(`${wordsToImport.length} ta so'z muvaffaqiyatli import qilindi!`);
      setSelectedWords(new Set());
    } catch (error) {
      toast.error("Import qilishda xatolik yuz berdi");
    } finally {
      setIsImporting(false);
      setImportProgress(0);
    }
  };

  const getLevelCount = (level: string) => {
    return words.filter(w => w.level === level).length;
  };

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
          <h3 className="font-semibold">EnglishProfile Lug'ati</h3>
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
        <Download className="w-4 h-4" />
        {isImporting
          ? `Import qilinmoqda... ${importProgress}%`
          : `${selectedWords.size} ta so'zni import qilish`}
      </Button>

      {/* Info */}
      <p className="text-xs text-center text-muted-foreground">
        Cambridge EnglishProfile - rasmiy CEFR so'zlar ro'yxati
      </p>
    </motion.div>
  );
};

export default WordDictionaryImport;
