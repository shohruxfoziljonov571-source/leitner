import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookText, Plus, Trash2, ChevronRight, Edit, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useMnemonics } from '@/hooks/useMnemonics';
import { useWordsDB } from '@/hooks/useWordsDB';
import { toast } from 'sonner';
import StoryDetailView from './StoryDetailView';

const WordStoriesTab: React.FC = () => {
  const { stories, createStory, deleteStory, isLoading } = useMnemonics();
  const { words } = useWordsDB();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newStoryText, setNewStoryText] = useState('');
  const [selectedWordIds, setSelectedWordIds] = useState<string[]>([]);
  const [searchWord, setSearchWord] = useState('');
  const [selectedStory, setSelectedStory] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredWords = words.filter(w => 
    w.original_word.toLowerCase().includes(searchWord.toLowerCase()) ||
    w.translated_word.toLowerCase().includes(searchWord.toLowerCase())
  );

  const toggleWord = (wordId: string) => {
    setSelectedWordIds(prev => 
      prev.includes(wordId) 
        ? prev.filter(id => id !== wordId)
        : [...prev, wordId]
    );
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || !newStoryText.trim()) {
      toast.error('Sarlavha va hikoyani kiriting');
      return;
    }

    setIsSubmitting(true);
    const result = await createStory({
      title: newTitle,
      story_text: newStoryText,
      wordIds: selectedWordIds,
    });

    if (result) {
      toast.success('Hikoya yaratildi!');
      setNewTitle('');
      setNewStoryText('');
      setSelectedWordIds([]);
      setIsCreateOpen(false);
    } else {
      toast.error('Xatolik yuz berdi');
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (storyId: string) => {
    await deleteStory(storyId);
    toast.success('Hikoya o\'chirildi');
  };

  if (selectedStory) {
    const story = stories.find(s => s.id === selectedStory);
    if (story) {
      return (
        <StoryDetailView
          storyId={story.id}
          storyTitle={story.title}
          storyText={story.story_text}
          onBack={() => setSelectedStory(null)}
        />
      );
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Yuklanmoqda...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Create Button */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogTrigger asChild>
          <Button className="w-full gap-2 gradient-primary text-primary-foreground">
            <Plus className="w-5 h-5" />
            Yangi hikoya yaratish
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yangi hikoya yaratish</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Hikoya sarlavhasi</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Masalan: Mening sayohatim"
              />
            </div>

            <div className="space-y-2">
              <Label>So'zlarni tanlang</Label>
              <Input
                placeholder="So'zni qidirish..."
                value={searchWord}
                onChange={(e) => setSearchWord(e.target.value)}
              />
              <div className="max-h-[150px] overflow-y-auto space-y-1 border rounded-lg p-2">
                {filteredWords.slice(0, 20).map(word => (
                  <button
                    key={word.id}
                    onClick={() => toggleWord(word.id)}
                    className={`w-full p-2 rounded-lg text-left transition-colors flex items-center gap-2 ${
                      selectedWordIds.includes(word.id) 
                        ? 'bg-primary/20 text-primary' 
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                      selectedWordIds.includes(word.id) ? 'bg-primary border-primary' : 'border-muted-foreground'
                    }`}>
                      {selectedWordIds.includes(word.id) && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                    <span className="font-medium">{word.original_word}</span>
                    <span className="text-muted-foreground">- {word.translated_word}</span>
                  </button>
                ))}
              </div>
              {selectedWordIds.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {selectedWordIds.length} ta so'z tanlandi
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Hikoya matni</Label>
              <Textarea
                value={newStoryText}
                onChange={(e) => setNewStoryText(e.target.value)}
                placeholder="Tanlangan so'zlarni ishlatib hikoya yozing. Masalan: Men bugun bozorga bordim. U yerda katta APPLE (olma) ko'rdim..."
                className="min-h-[150px]"
              />
            </div>

            <Button 
              onClick={handleCreate} 
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? 'Yaratilmoqda...' : 'Yaratish'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stories List */}
      {stories.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-12"
        >
          <BookText className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="font-semibold text-lg mb-2">Hali hikoya yo'q</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Hikoya usulida bir nechta so'zni bitta qiziqarli hikoyaga bog'laysiz.
            Bu usul so'zlarni uzoq eslab qolishga yordam beradi.
          </p>
        </motion.div>
      ) : (
        <div className="grid gap-3">
          <AnimatePresence>
            {stories.map((story, index) => (
              <motion.div
                key={story.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: index * 0.05 }}
                className="bg-card rounded-2xl p-4 shadow-sm border border-border hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setSelectedStory(story.id)}
                    className="flex items-center gap-3 flex-1 text-left"
                  >
                    <div className="p-2 rounded-xl bg-violet-500/10 text-violet-500">
                      <BookText className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{story.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {story.story_text.slice(0, 60)}...
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(story.id)}
                    className="text-destructive hover:text-destructive ml-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Info Section */}
      <div className="mt-6 p-4 bg-muted/50 rounded-xl">
        <h4 className="font-medium mb-2 flex items-center gap-2">
          <BookText className="w-4 h-4 text-violet-500" />
          Hikoya usuli nima?
        </h4>
        <p className="text-sm text-muted-foreground">
          Bu usulda siz bir nechta so'zni qiziqarli hikoya orqali bog'laysiz.
          Masalan: "cat", "run", "tree" so'zlarini "Mushuk daraxtga yugurdi" hikoyasi bilan birlashtiring.
          Hikoya qanchalik g'alati bo'lsa, shunchalik yaxshi esda qoladi!
        </p>
      </div>
    </div>
  );
};

export default WordStoriesTab;
