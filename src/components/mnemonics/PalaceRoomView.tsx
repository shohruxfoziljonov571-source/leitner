import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, DoorOpen, Plus, Trash2, Sparkles, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useMnemonics } from '@/hooks/useMnemonics';
import { useWordsDB } from '@/hooks/useWordsDB';
import { toast } from 'sonner';

interface PalaceRoom {
  id: string;
  name: string;
  position: number;
  description: string | null;
  words?: {
    id: string;
    word_id: string;
    visual_note: string | null;
    word?: {
      original_word: string;
      translated_word: string;
    };
  }[];
}

interface Props {
  palaceId: string;
  palaceName: string;
  onBack: () => void;
}

const PalaceRoomView: React.FC<Props> = ({ palaceId, palaceName, onBack }) => {
  const { getPalaceRooms, placeWordInRoom, removeWordFromRoom, updatePlacementNote } = useMnemonics();
  const { words } = useWordsDB();
  const [rooms, setRooms] = useState<PalaceRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [isAddWordOpen, setIsAddWordOpen] = useState(false);
  const [searchWord, setSearchWord] = useState('');
  const [visualNote, setVisualNote] = useState('');

  const loadRooms = async () => {
    setIsLoading(true);
    const data = await getPalaceRooms(palaceId);
    setRooms(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadRooms();
  }, [palaceId]);

  const filteredWords = words.filter(w => 
    w.original_word.toLowerCase().includes(searchWord.toLowerCase()) ||
    w.translated_word.toLowerCase().includes(searchWord.toLowerCase())
  );

  const handleAddWord = async (wordId: string) => {
    if (!selectedRoom) return;

    const result = await placeWordInRoom(selectedRoom, wordId, visualNote);
    if (result) {
      toast.success('So\'z xonaga joylashtirildi!');
      setVisualNote('');
      setSearchWord('');
      setIsAddWordOpen(false);
      loadRooms();
    } else {
      toast.error('Xatolik yuz berdi');
    }
  };

  const handleRemoveWord = async (placementId: string) => {
    await removeWordFromRoom(placementId);
    toast.success('So\'z olib tashlandi');
    loadRooms();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Yuklanmoqda...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="font-display font-bold text-xl">{palaceName}</h2>
          <p className="text-sm text-muted-foreground">{rooms.length} xona</p>
        </div>
      </div>

      {/* Rooms Grid */}
      <div className="grid gap-4">
        {rooms.map((room, index) => (
          <motion.div
            key={room.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-card rounded-2xl p-4 border border-border"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-accent/50">
                  <DoorOpen className="w-5 h-5 text-accent-foreground" />
                </div>
                <h3 className="font-semibold">{room.name}</h3>
              </div>
              <Dialog open={isAddWordOpen && selectedRoom === room.id} onOpenChange={(open) => {
                setIsAddWordOpen(open);
                if (open) setSelectedRoom(room.id);
              }}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Plus className="w-4 h-4" />
                    So'z qo'shish
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{room.name}ga so'z joylash</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <Input
                      placeholder="So'zni qidirish..."
                      value={searchWord}
                      onChange={(e) => setSearchWord(e.target.value)}
                    />
                    
                    <div className="max-h-[200px] overflow-y-auto space-y-2">
                      {filteredWords.slice(0, 10).map(word => (
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
                          So'z topilmadi
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        Vizual eslatma (ixtiyoriy)
                      </label>
                      <Textarea
                        value={visualNote}
                        onChange={(e) => setVisualNote(e.target.value)}
                        placeholder="Masalan: Stol ustida katta qizil olma turibdi..."
                      />
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Words in room */}
            {room.words && room.words.length > 0 ? (
              <div className="space-y-2">
                {room.words.map((placement) => (
                  <div 
                    key={placement.id}
                    className="flex items-start gap-3 p-3 rounded-xl bg-muted/50"
                  >
                    <BookOpen className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">
                        {placement.word?.original_word} - {placement.word?.translated_word}
                      </p>
                      {placement.visual_note && (
                        <p className="text-sm text-muted-foreground mt-1">
                          💭 {placement.visual_note}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveWord(placement.id)}
                      className="text-destructive hover:text-destructive flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Bu xonada hali so'z yo'q
              </p>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default PalaceRoomView;
