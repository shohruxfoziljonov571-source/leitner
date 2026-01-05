import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, Trash2, Volume2, Check, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
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

  const filteredWords = words.filter(word =>
    word.original_word.toLowerCase().includes(searchQuery.toLowerCase()) ||
    word.translated_word.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (word: typeof words[0]) => {
    setEditingId(word.id);
    setEditForm({
      original: word.original_word,
      translated: word.translated_word,
    });
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
        <p className="text-muted-foreground">Hali so'zlar yo'q</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="So'z qidirish..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <p className="text-sm text-muted-foreground">
        Jami: {filteredWords.length} ta so'z
      </p>

      {/* Word List */}
      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
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
              <Card className="p-3">
                {editingId === word.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={editForm.original}
                        onChange={(e) => setEditForm({ ...editForm, original: e.target.value })}
                        placeholder="Asl so'z"
                        autoFocus
                      />
                      <Input
                        value={editForm.translated}
                        onChange={(e) => setEditForm({ ...editForm, translated: e.target.value })}
                        placeholder="Tarjima"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancel}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Bekor
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSave(word.id)}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Saqlash
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{word.original_word}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => speak(word.original_word, { lang: word.source_language })}
                          disabled={isSpeaking}
                        >
                          <Volume2 className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {word.translated_word}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-1 ml-2">
                      <span className={`
                        text-xs px-2 py-0.5 rounded-full shrink-0
                        ${word.box_number >= 4 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                          word.box_number >= 2 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 
                          'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}
                      `}>
                        #{word.box_number}
                      </span>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(word)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>So'zni o'chirish</AlertDialogTitle>
                            <AlertDialogDescription>
                              "{word.original_word}" so'zini o'chirishni xohlaysizmi? Bu amalni qaytarib bo'lmaydi.
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
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default WordList;
