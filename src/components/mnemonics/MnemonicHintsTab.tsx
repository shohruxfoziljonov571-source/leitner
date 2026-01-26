import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, Search, Edit, Check, X, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useWordsDB } from '@/hooks/useWordsDB';
import { useMnemonics } from '@/hooks/useMnemonics';
import { toast } from 'sonner';

const MnemonicHintsTab: React.FC = () => {
  const { words, updateWord } = useWordsDB();
  const { updateWordMnemonicHint } = useMnemonics();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingWordId, setEditingWordId] = useState<string | null>(null);
  const [editHint, setEditHint] = useState('');

  const filteredWords = words.filter(w => 
    w.original_word.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.translated_word.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startEdit = (wordId: string, currentHint: string | null) => {
    setEditingWordId(wordId);
    setEditHint(currentHint || '');
  };

  const saveHint = async () => {
    if (!editingWordId) return;

    const success = await updateWordMnemonicHint(editingWordId, editHint);
    if (success) {
      toast.success('Eslatma saqlandi!');
      setEditingWordId(null);
      setEditHint('');
    } else {
      toast.error('Xatolik yuz berdi');
    }
  };

  const cancelEdit = () => {
    setEditingWordId(null);
    setEditHint('');
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="So'z qidirish..."
          className="pl-10"
        />
      </div>

      {/* Words List */}
      {filteredWords.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-12"
        >
          <Lightbulb className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="font-semibold text-lg mb-2">
            {words.length === 0 ? 'Hali so\'z yo\'q' : 'So\'z topilmadi'}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {words.length === 0 
              ? 'Avval so\'zlar qo\'shing, keyin ularga eslatmalar yozing.'
              : 'Boshqa so\'zni qidirib ko\'ring.'}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filteredWords.map((word, index) => {
              const isEditing = editingWordId === word.id;
              // We need to access mnemonic_hint from the word
              // Since it's a new column, we'll need to refetch or cast
              const hint = (word as any).mnemonic_hint as string | null;
              
              return (
                <motion.div
                  key={word.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="bg-card rounded-2xl p-4 border border-border"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-lg">{word.original_word}</span>
                        <span className="text-muted-foreground">-</span>
                        <span className="text-primary">{word.translated_word}</span>
                      </div>
                      
                      {isEditing ? (
                        <div className="mt-2 space-y-2">
                          <Textarea
                            value={editHint}
                            onChange={(e) => setEditHint(e.target.value)}
                            placeholder="Eslatma yozing. Masalan: 'cat' = 'katta' mushuk - 'katta' so'ziga o'xshaydi"
                            className="min-h-[80px]"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={saveHint} className="gap-1">
                              <Check className="w-4 h-4" />
                              Saqlash
                            </Button>
                            <Button size="sm" variant="ghost" onClick={cancelEdit}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ) : hint ? (
                        <div className="mt-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                          <p className="text-sm flex items-start gap-2">
                            <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                            <span>{hint}</span>
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground mt-1">
                          Eslatma yoq. Yozish uchun "Tahrirlash" bosing.
                        </p>
                      )}
                    </div>
                    
                    {!isEditing && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEdit(word.id, hint)}
                        className="flex-shrink-0 gap-1"
                      >
                        <Edit className="w-4 h-4" />
                        {hint ? 'Tahrirlash' : 'Qo\'shish'}
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Info Section */}
      <div className="mt-6 p-4 bg-muted/50 rounded-xl">
        <h4 className="font-medium mb-2 flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          Eslatma/Assotsiatsiya nima?
        </h4>
        <p className="text-sm text-muted-foreground">
          Har bir so'zga o'zingiz yozgan eslatma. Masalan: 
          <br/>
          • "book" = "буква" (rus tilida) ga o'xshaydi
          <br/>
          • "apple" = "olam" + "pl" = olam planeti kabi yumaloq
          <br/>
          Qanchalik g'alati yoki kulgili bo'lsa, shunchalik yaxshi esda qoladi!
        </p>
      </div>
    </div>
  );
};

export default MnemonicHintsTab;
