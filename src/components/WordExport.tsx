import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWordsDB } from '@/hooks/useWordsDB';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

type ExportFormat = 'xlsx' | 'csv';

const WordExport: React.FC = () => {
  const { words } = useWordsDB();
  const { t } = useLanguage();
  const [exporting, setExporting] = useState(false);

  const exportWords = (format: ExportFormat) => {
    if (words.length === 0) {
      toast.error(t('noWordsToExport') || "Eksport qilish uchun so'zlar yo'q");
      return;
    }

    setExporting(true);
    try {
      const data = words.map((w, i) => ({
        '#': i + 1,
        [t('originalWord') || "So'z"]: w.original_word,
        [t('translation') || 'Tarjima']: w.translated_word,
        [t('box') || 'Quti']: w.box_number,
        [t('reviewsToday') || 'Takrorlar']: w.times_reviewed,
        ['✓']: w.times_correct,
        ['✗']: w.times_incorrect,
        [t('addedDate') || "Qo'shilgan"]: new Date(w.created_at).toLocaleDateString(),
        [t('lastReviewed') || "Oxirgi takror"]: w.last_reviewed
          ? new Date(w.last_reviewed).toLocaleDateString()
          : '—',
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "So'zlar");

      // Auto-width columns
      const colWidths = Object.keys(data[0]).map(key => ({
        wch: Math.max(key.length, ...data.map(row => String((row as any)[key]).length)) + 2
      }));
      ws['!cols'] = colWidths;

      const fileName = `sozlar_${new Date().toISOString().split('T')[0]}`;

      if (format === 'csv') {
        XLSX.writeFile(wb, `${fileName}.csv`, { bookType: 'csv' });
      } else {
        XLSX.writeFile(wb, `${fileName}.xlsx`);
      }

      toast.success(`${words.length} ta so'z eksport qilindi ✅`);
    } catch (err) {
      console.error('Export error:', err);
      toast.error("Eksport qilishda xatolik");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => exportWords('xlsx')}
        disabled={exporting || words.length === 0}
        className="gap-1.5"
      >
        <FileSpreadsheet className="w-4 h-4" />
        Excel
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => exportWords('csv')}
        disabled={exporting || words.length === 0}
        className="gap-1.5"
      >
        <FileText className="w-4 h-4" />
        CSV
      </Button>
    </div>
  );
};

export default WordExport;
