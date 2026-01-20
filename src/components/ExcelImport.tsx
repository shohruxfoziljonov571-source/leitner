import React, { useState, useRef, useCallback, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileSpreadsheet, Check, AlertCircle, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLanguageName } from '@/lib/languages';
import { toast } from 'sonner';

interface ImportedWord {
  originalWord: string;
  translatedWord: string;
  examples?: string;
}

interface ExcelImportProps {
  sourceLanguage: string;
  targetLanguage: string;
  onImport: (words: { originalWord: string; translatedWord: string; exampleSentences: string[] }[]) => Promise<void>;
}

// ForwardRef wrapper to fix AnimatePresence warning
const ExcelImport = forwardRef<HTMLDivElement, ExcelImportProps>(({ sourceLanguage, targetLanguage, onImport }, ref) => {
  const { language } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importProgress, setImportProgress] = useState(0);
  const [previewData, setPreviewData] = useState<ImportedWord[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    
    if (!validTypes.includes(file.type) && !file.name.endsWith('.csv') && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('Faqat Excel (.xlsx, .xls) yoki CSV fayllar qabul qilinadi');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Fayl hajmi 5MB dan oshmasligi kerak');
      return;
    }

    setError('');
    setFileName(file.name);
    setIsProcessing(true);
    setProgress(10);

    try {
      // Dynamic import for better bundle splitting
      const XLSX = await import('xlsx');
      
      const data = await file.arrayBuffer();
      setProgress(30);
      
      const workbook = XLSX.read(data);
      setProgress(50);
      
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet, { header: 1 });
      setProgress(70);

      // Parse the data - expect columns: originalWord, translatedWord, examples (optional)
      const words: ImportedWord[] = [];
      
      // Skip header row if it looks like headers
      const startRow = jsonData.length > 0 && 
        typeof jsonData[0][0] === 'string' && 
        (jsonData[0][0].toLowerCase().includes('word') || 
         jsonData[0][0].toLowerCase().includes('so\'z') ||
         jsonData[0][0].toLowerCase().includes('слово')) ? 1 : 0;

      for (let i = startRow; i < jsonData.length; i++) {
        const row = jsonData[i] as any[];
        if (row && row[0] && row[1]) {
          const originalWord = String(row[0]).trim();
          const translatedWord = String(row[1]).trim();
          
          // Validate word length
          if (originalWord.length > 100 || translatedWord.length > 100) {
            continue; // Skip overly long entries
          }
          
          if (originalWord && translatedWord) {
            words.push({
              originalWord,
              translatedWord,
              examples: row[2] ? String(row[2]).trim() : undefined,
            });
          }
        }
      }

      setProgress(100);
      
      if (words.length === 0) {
        setError('Faylda so\'zlar topilmadi. Ustunlar: A - asl so\'z, B - tarjima, C - misollar (ixtiyoriy)');
        setPreviewData([]);
      } else if (words.length > 1000) {
        setError('Maksimum 1000 ta so\'z import qilish mumkin. Faylda ' + words.length + ' ta so\'z bor.');
        setPreviewData(words.slice(0, 1000));
      } else {
        setPreviewData(words);
      }
    } catch (err) {
      console.error('Error parsing file:', err);
      setError('Faylni o\'qishda xatolik yuz berdi');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (previewData.length === 0) return;

    setIsImporting(true);
    setImportProgress(0);

    try {
      const wordsToImport = previewData.map(w => ({
        originalWord: w.originalWord,
        translatedWord: w.translatedWord,
        exampleSentences: w.examples ? w.examples.split(';').map(s => s.trim()).filter(s => s.length > 0) : [],
      }));

      // Simulate progress for UX (bulk insert is fast)
      const progressInterval = setInterval(() => {
        setImportProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 100);

      await onImport(wordsToImport);
      
      clearInterval(progressInterval);
      setImportProgress(100);
      
      toast.success(`${wordsToImport.length} ta so'z muvaffaqiyatli import qilindi!`);
      
      // Reset state after a brief delay to show 100%
      setTimeout(() => {
        setPreviewData([]);
        setFileName('');
        setImportProgress(0);
        setIsImporting(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 500);
    } catch (err) {
      toast.error('Import qilishda xatolik yuz berdi');
      setIsImporting(false);
      setImportProgress(0);
    }
  };

  const handleClear = () => {
    setPreviewData([]);
    setFileName('');
    setError('');
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = async () => {
    // Dynamic import for better bundle splitting
    const XLSX = await import('xlsx');
    
    const templateData = [
      [getLanguageName(sourceLanguage, language), getLanguageName(targetLanguage, language), 'Misollar (ixtiyoriy)'],
      ['Hello', 'Salom', 'Hello, how are you?; Hello world'],
      ['Book', 'Kitob', 'I read a book'],
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Words');
    XLSX.writeFile(wb, 'leitner_template.xlsx');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Download Template */}
      <button
        onClick={downloadTemplate}
        className="flex items-center gap-2 text-sm text-primary hover:underline"
      >
        <Download className="w-4 h-4" />
        Namuna faylni yuklab olish
      </button>

      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileSelect}
        className="hidden"
      />

      {!fileName ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-muted-foreground/30 rounded-2xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
        >
          <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="font-medium text-foreground mb-1">Faylni tanlang yoki bu yerga tashlang</p>
          <p className="text-sm text-muted-foreground">Excel (.xlsx, .xls) yoki CSV fayl</p>
        </div>
      ) : (
        <div className="bg-muted/50 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-8 h-8 text-primary" />
              <div>
                <p className="font-medium text-sm">{fileName}</p>
                <p className="text-xs text-muted-foreground">{previewData.length} ta so'z topildi</p>
              </div>
            </div>
            <button
              onClick={handleClear}
              className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-destructive" />
            </button>
          </div>
          
          {isProcessing && (
            <Progress value={progress} className="h-2" />
          )}
        </div>
      )}

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-xl text-sm"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview */}
      <AnimatePresence>
        {previewData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <h4 className="font-medium text-sm">Ko'rib chiqish (birinchi 10 ta):</h4>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
              {previewData.slice(0, 10).map((word, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-background rounded-xl text-sm"
                >
                  <span className="font-medium">{word.originalWord}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-primary">{word.translatedWord}</span>
                </div>
              ))}
              {previewData.length > 10 && (
                <p className="text-center text-sm text-muted-foreground py-2">
                  ... va yana {previewData.length - 10} ta so'z
                </p>
              )}
            </div>

            {isImporting && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Import qilinmoqda...</span>
                  <span className="font-medium text-primary">{importProgress}%</span>
                </div>
                <Progress value={importProgress} className="h-3" />
              </div>
            )}

            <Button
              onClick={handleImport}
              disabled={isImporting}
              className="w-full gap-2 gradient-primary text-primary-foreground"
            >
              <Check className="w-4 h-4" />
              {isImporting ? `Import qilinmoqda... ${importProgress}%` : `${previewData.length} ta so'zni import qilish`}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

ExcelImport.displayName = 'ExcelImport';

export default ExcelImport;
