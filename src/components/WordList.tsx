import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, Trash2, Volume2, Check, X, Search, Filter, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import WordExport from '@/components/WordExport';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useLearningLanguage } from '@/contexts/LearningLanguageContext';
import { useWordsDB, type Word } from '@/hooks/useWordsDB';
import { useSpeech } from '@/hooks/useSpeech';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const PAGE_SIZE = 50;

const WordList: React.FC = () => {
  const { user } = useAuth();
  const { activeLanguage } = useLearningLanguage();
  const { updateWord, deleteWord } = useWordsDB();
  const { speak, isSpeaking } = useSpeech();

  const [words, setWords] = useState<(Word & { total_count?: number })[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [boxFilter, setBoxFilter] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ original: '', translated: '' });

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const fetchWords = useCallback(async (query: string, box: number | null, pageNum: number) => {
    if (!user?.id || !activeLanguage?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('search_words', {
        p_user_id: user.id,
        p_language_id: activeLanguage.id,
        p_query: query.trim(),
        p_box_number: box,
        p_limit: PAGE_SIZE,
        p_offset: pageNum * PAGE_SIZE,
      });
      if (error) throw error;
      const results = (data || []) as (Word & { total_count: number })[];
      setWords(results);
      setTotalCount(results.length > 0 ? Number(results[0].total_count) : 0);
    } catch (error) {
      console.error('Error searching words:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, activeLanguage?.id]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(0);
      fetchWords(searchQuery, boxFilter, 0);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, boxFilter, fetchWords]);

  // Page change
  useEffect(() => {
    if (page > 0) fetchWords(searchQuery, boxFilter, page);
  }, [page]);

  const handleEdit = (word: Word) => {
    setEditingId(word.id);
    setEditForm({ original: word.original_word, translated: word.translated_word });
  };

  const handleSave = async (wordId: string) => {
    if (!editForm.original.trim() || !editForm.translated.trim()) {
      toast.error("Bo'sh qoldirib bo'lmaydi");
      return;
    }
    const result = await updateWord(wordId, {
      original_word: editForm.original.trim(),
      translated_word: editForm.translated.trim(),
    });
    if (result) {
      toast.success("So'z yangilandi");
      setEditingId(null);
      setWords(prev => prev.map(w => w.id === wordId ? { ...w, original_word: editForm.original.trim(), translated_word: editForm.translated.trim() } : w));
    } else {
      toast.error("Xatolik yuz berdi");
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({ original: '', translated: '' });
  };

  const handleDelete = async (wordId: string) => {
    await deleteWord(wordId);
    toast.success("So'z o'chirildi");
    setWords(prev => prev.filter(w => w.id !== wordId));
    setTotalCount(prev => Math.max(0, prev - 1));
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (isLoading && words.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Yuklanmoqda...</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search + Filters */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="So'z qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 bg-card border-border rounded-xl text-sm"
          />
        </div>
        <Button
          variant={showFilters || boxFilter ? "default" : "outline"}
          size="icon"
          className="h-10 w-10 shrink-0 rounded-xl"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="w-4 h-4" />
        </Button>
        <WordExport />
      </div>

      {/* Filter chips */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-1.5 pb-1">
              <button
                onClick={() => setBoxFilter(null)}
                className={`text-[11px] px-2.5 py-1 rounded-full transition-colors ${
                  boxFilter === null ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                Barchasi
              </button>
              {[1, 2, 3, 4, 5].map(box => (
                <button
                  key={box}
                  onClick={() => setBoxFilter(boxFilter === box ? null : box)}
                  className={`text-[11px] px-2.5 py-1 rounded-full transition-colors ${
                    boxFilter === box ? 'text-primary-foreground' : 'text-muted-foreground hover:opacity-80'
                  }`}
                  style={{
                    backgroundColor: boxFilter === box
                      ? `hsl(var(--box-${box}))`
                      : `hsl(var(--box-${box}) / 0.15)`,
                    color: boxFilter === box ? 'white' : `hsl(var(--box-${box}))`,
                  }}
                >
                  Box {box}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
          {searchQuery || boxFilter ? 'Natijalar' : "So'nggi qo'shilganlar"}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {totalCount} ta
        </p>
      </div>

      {/* Word List */}
      {words.length === 0 && !isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-sm">
            {searchQuery || boxFilter ? "Natija topilmadi" : "Hali so'zlar yo'q"}
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-0.5">
          <AnimatePresence mode="popLayout">
            {words.map((word) => (
              <motion.div
                key={word.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.2 }}
              >
                <div className="bg-card rounded-xl p-3 border border-border/50">
                  {editingId === word.id ? (
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={editForm.original}
                          onChange={(e) => setEditForm({ ...editForm, original: e.target.value })}
                          placeholder="Asl so'z"
                          autoFocus
                          className="h-9 text-sm"
                        />
                        <Input
                          value={editForm.translated}
                          onChange={(e) => setEditForm({ ...editForm, translated: e.target.value })}
                          placeholder="Tarjima"
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="flex justify-end gap-1.5">
                        <Button variant="ghost" size="sm" onClick={handleCancel} className="h-8 text-xs">
                          <X className="w-3 h-3 mr-1" /> Bekor
                        </Button>
                        <Button size="sm" onClick={() => handleSave(word.id)} className="h-8 text-xs gradient-primary text-primary-foreground">
                          <Check className="w-3 h-3 mr-1" /> Saqlash
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-sm text-foreground truncate">{word.original_word}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 shrink-0"
                            onClick={() => speak(word.original_word, { lang: word.source_language })}
                            disabled={isSpeaking}
                          >
                            <Volume2 className="w-3 h-3" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {word.translated_word}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0 font-medium"
                          style={{
                            backgroundColor: `hsl(var(--box-${word.box_number}) / 0.15)`,
                            color: `hsl(var(--box-${word.box_number}))`,
                          }}
                        >
                          #{word.box_number}
                        </span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(word)}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>So'zni o'chirish</AlertDialogTitle>
                              <AlertDialogDescription>
                                "{word.original_word}" so'zini o'chirishni xohlaysizmi?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Bekor</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(word.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                O'chirish
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage(p => Math.max(0, p - 1))}
            className="h-8 text-xs rounded-lg"
          >
            ←
          </Button>
          <span className="text-xs text-muted-foreground">
            {page + 1} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
            className="h-8 text-xs rounded-lg"
          >
            →
          </Button>
        </div>
      )}
    </div>
  );
};

export default React.memo(WordList);
