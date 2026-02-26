import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, Trash2, Volume2, Check, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import WordExport from '@/components/WordExport';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useWordsDB } from '@/hooks/useWordsDB';
import { useSpeech } from '@/hooks/useSpeech';
import { toast } from 'sonner';

const WordList: React.FC = () => {
  const { words, updateWord, deleteWord, isLoading } = useWordsDB();
  const { speak, isSpeaking } = useSpeech();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ original: '', translated: '' });
  const [searchQuery, setSearchQuery] = useState('');

  const filteredWords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return words;
    return words.filter(word =>
      word.original_word.toLowerCase().includes(q) ||
      word.translated_word.toLowerCase().includes(q)
    );
  }, [words, searchQuery]);

  const handleEdit = (word: typeof words[0]) => {
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
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Yuklanmoqda...</div>
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-sm">Hali so'zlar yo'q</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search + Export */}
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
        <WordExport />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
          So'nggi qo'shilganlar
        </p>
        <p className="text-[11px] text-muted-foreground">
          {filteredWords.length} ta
        </p>
      </div>

      {/* Word List */}
      <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-0.5">
        <AnimatePresence mode="popLayout">
          {filteredWords.map((word) => (
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
    </div>
  );
};

export default React.memo(WordList);
