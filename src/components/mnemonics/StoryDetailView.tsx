import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, BookText, Plus, Trash2, Edit, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useMnemonics } from '@/hooks/useMnemonics';
import { useWordsDB } from '@/hooks/useWordsDB';
import { toast } from 'sonner';

interface StoryWord {
  id: string;
  word_id: string;
  position: number;
  word?: {
    original_word: string;
    translated_word: string;
  };
}

interface Props {
  storyId: string;
  storyTitle: string;
  storyText: string;
  onBack: () => void;
}

const StoryDetailView: React.FC<Props> = ({ storyId, storyTitle, storyText, onBack }) => {
  const { getStoryWords, addWordToStory, removeWordFromStory, updateStory } = useMnemonics();
  const { words } = useWordsDB();
  const [storyWords, setStoryWords] = useState<StoryWord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddWordOpen, setIsAddWordOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(storyTitle);
  const [editText, setEditText] = useState(storyText);
  const [searchWord, setSearchWord] = useState('');

  const loadStoryWords = async () => {
    setIsLoading(true);
    const data = await getStoryWords(storyId);
    setStoryWords(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadStoryWords();
  }, [storyId]);

  const filteredWords = words.filter(w => 
    (w.original_word.toLowerCase().includes(searchWord.toLowerCase()) ||
    w.translated_word.toLowerCase().includes(searchWord.toLowerCase())) &&
    !storyWords.some(sw => sw.word_id === w.id)
  );

  const handleAddWord = async (wordId: string) => {
    const result = await addWordToStory(storyId, wordId);
    if (result) {
      toast.success('So\'z qo\'shildi!');
      setSearchWord('');
      setIsAddWordOpen(false);
      loadStoryWords();
    }
  };

  const handleRemoveWord = async (storyWordId: string) => {
    await removeWordFromStory(storyWordId);
    toast.success('So\'z olib tashlandi');
    loadStoryWords();
  };

  const handleSaveEdit = async () => {
    await updateStory(storyId, { title: editTitle, story_text: editText });
    toast.success('Hikoya yangilandi');
    setIsEditing(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          {isEditing ? (
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="font-display font-bold text-xl"
            />
          ) : (
            <h2 className="font-display font-bold text-xl">{storyTitle}</h2>
          )}
        </div>
        {isEditing ? (
          <div className="flex gap-2">
            <Button size="icon" onClick={handleSaveEdit}>
              <Check className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="icon" onClick={() => setIsEditing(true)}>
            <Edit className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Story Text */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl p-5 border border-border"
      >
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <BookText className="w-5 h-5 text-violet-500" />
          Hikoya
        </h3>
        {isEditing ? (
          <Textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="min-h-[200px]"
          />
        ) : (
          <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed">
            {storyText}
          </p>
        )}
      </motion.div>

      {/* Words in Story */}
      <div className="bg-card rounded-2xl p-5 border border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Hikoyaga bog'langan so'zlar</h3>
          <Dialog open={isAddWordOpen} onOpenChange={setIsAddWordOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                <Plus className="w-4 h-4" />
                So'z qo'shish
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Hikoyaga so'z qo'shish</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <Input
                  placeholder="So'zni qidirish..."
                  value={searchWord}
                  onChange={(e) => setSearchWord(e.target.value)}
                />
                <div className="max-h-[300px] overflow-y-auto space-y-2">
                  {filteredWords.slice(0, 15).map(word => (
                    <button
                      key={word.id}
                      onClick={() => handleAddWord(word.id)}
                      className="w-full p-3 rounded-lg bg-muted hover:bg-primary/10 text-left transition-colors"
                    >
                      <span className="font-medium">{word.original_word}</span>
                      <span className="text-muted-foreground"> - {word.translated_word}</span>
                    </button>
                  ))}
                  {filteredWords.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">
                      So'z topilmadi yoki barcha so'zlar qo'shilgan
                    </p>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="animate-pulse text-muted-foreground text-center py-4">
            Yuklanmoqda...
          </div>
        ) : storyWords.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Hali so'z qo'shilmagan
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {storyWords.map((sw) => (
              <motion.div
                key={sw.id}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-violet-500/10 text-violet-700 dark:text-violet-300"
              >
                <span className="font-medium">{sw.word?.original_word}</span>
                <span className="text-sm opacity-70">({sw.word?.translated_word})</span>
                <button
                  onClick={() => handleRemoveWord(sw.id)}
                  className="text-destructive hover:text-destructive/80"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StoryDetailView;
