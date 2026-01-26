import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Castle, Plus, Trash2, DoorOpen, ChevronRight, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useMnemonics } from '@/hooks/useMnemonics';
import { toast } from 'sonner';
import PalaceRoomView from './PalaceRoomView';

const MemoryPalaceTab: React.FC = () => {
  const { palaces, createPalace, deletePalace, getPalaceRooms, isLoading } = useMnemonics();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newPalaceName, setNewPalaceName] = useState('');
  const [newPalaceDesc, setNewPalaceDesc] = useState('');
  const [roomsCount, setRoomsCount] = useState(5);
  const [selectedPalace, setSelectedPalace] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!newPalaceName.trim()) {
      toast.error('Saroy nomini kiriting');
      return;
    }

    setIsSubmitting(true);
    const result = await createPalace({
      name: newPalaceName,
      description: newPalaceDesc,
      rooms_count: roomsCount,
    });

    if (result) {
      toast.success('Xotira saroyi yaratildi!');
      setNewPalaceName('');
      setNewPalaceDesc('');
      setRoomsCount(5);
      setIsCreateOpen(false);
    } else {
      toast.error('Xatolik yuz berdi');
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (palaceId: string) => {
    await deletePalace(palaceId);
    toast.success('Saroy o\'chirildi');
  };

  if (selectedPalace) {
    return (
      <PalaceRoomView
        palaceId={selectedPalace}
        palaceName={palaces.find(p => p.id === selectedPalace)?.name || ''}
        onBack={() => setSelectedPalace(null)}
      />
    );
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
            Yangi xotira saroyi
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yangi xotira saroyi yaratish</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Saroy nomi</Label>
              <Input
                value={newPalaceName}
                onChange={(e) => setNewPalaceName(e.target.value)}
                placeholder="Masalan: Uyim, Maktabim..."
              />
            </div>
            <div className="space-y-2">
              <Label>Tavsif (ixtiyoriy)</Label>
              <Textarea
                value={newPalaceDesc}
                onChange={(e) => setNewPalaceDesc(e.target.value)}
                placeholder="Bu joy haqida..."
              />
            </div>
            <div className="space-y-2">
              <Label>Xonalar soni</Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={roomsCount}
                onChange={(e) => setRoomsCount(Number(e.target.value))}
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

      {/* Palace List */}
      {palaces.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-12"
        >
          <Castle className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="font-semibold text-lg mb-2">Hali xotira saroyi yo'q</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Xotira saroyi - tasavvuringizdagi joy. Har bir xonaga so'zlarni joylashtirib eslab qolasiz.
          </p>
        </motion.div>
      ) : (
        <div className="grid gap-3">
          <AnimatePresence>
            {palaces.map((palace, index) => (
              <motion.div
                key={palace.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: index * 0.05 }}
                className="bg-card rounded-2xl p-4 shadow-sm border border-border hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setSelectedPalace(palace.id)}
                    className="flex items-center gap-3 flex-1 text-left"
                  >
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                      <Castle className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{palace.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {palace.rooms_count} xona
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(palace.id)}
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
          <Castle className="w-4 h-4 text-primary" />
          Xotira saroyi nima?
        </h4>
        <p className="text-sm text-muted-foreground">
          Bu usulda siz tanish joyni (uyingiz, maktabingiz) tasavvur qilasiz. 
          Har bir xonaga so'zni joylashtirasiz va vizual obraz yaratasiz. 
          Masalan: "apple" so'zini oshxonaga, stol ustiga qo'yasiz - katta qizil olma.
        </p>
      </div>
    </div>
  );
};

export default MemoryPalaceTab;
