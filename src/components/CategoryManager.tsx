import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Check, Folder, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCategories, DEFAULT_CATEGORIES, Category } from '@/hooks/useCategories';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface CategoryManagerProps {
  selectedCategory?: string | null;
  onSelectCategory?: (categoryId: string | null) => void;
  mode?: 'select' | 'manage';
}

const EMOJI_OPTIONS = ['📁', '🏠', '💼', '✈️', '🍽️', '🏥', '⚽', '👕', '💻', '🎵', '📚', '🎬', '🛒', '💰', '🎮', '🌍'];

const CategoryManager: React.FC<CategoryManagerProps> = ({ 
  selectedCategory, 
  onSelectCategory,
  mode = 'select' 
}) => {
  const { categories, isLoading, addCategory, deleteCategory, initializeDefaultCategories } = useCategories();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('📁');

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    await addCategory({
      name: newCategoryName.trim(),
      icon: selectedEmoji,
      color: `hsl(${Math.random() * 360}, 70%, 50%)`,
    });
    
    setNewCategoryName('');
    setSelectedEmoji('📁');
    setIsDialogOpen(false);
  };

  if (isLoading) {
    return <div className="animate-pulse h-10 bg-muted rounded-xl" />;
  }

  return (
    <div className="space-y-4">
      {/* Category Pills */}
      <div className="flex flex-wrap gap-2">
        {/* All categories option */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelectCategory?.(null)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
            selectedCategory === null
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'bg-muted hover:bg-muted/80 text-foreground'
          }`}
        >
          <Folder className="w-4 h-4" />
          Hammasi
        </motion.button>

        {categories.map((category) => (
          <motion.button
            key={category.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelectCategory?.(category.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
              selectedCategory === category.id
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'bg-muted hover:bg-muted/80 text-foreground'
            }`}
          >
            <span>{category.icon}</span>
            {category.name}
          </motion.button>
        ))}

        {/* Add Category Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 rounded-full text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Yangi
            </motion.button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Yangi kategoriya</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex gap-3">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-2xl">
                  {selectedEmoji}
                </div>
                <Input
                  placeholder="Kategoriya nomi"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1"
                />
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-2">Emoji tanlang:</p>
                <div className="flex flex-wrap gap-2">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setSelectedEmoji(emoji)}
                      className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${
                        selectedEmoji === emoji
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <Button onClick={handleAddCategory} className="w-full gap-2">
                <Check className="w-4 h-4" />
                Qo'shish
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Initialize Default Categories */}
      {categories.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-primary/5 border border-primary/10"
        >
          <p className="text-sm text-muted-foreground mb-3">
            Kategoriyalar hali yo'q. Standart kategoriyalarni qo'shishni xohlaysizmi?
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={initializeDefaultCategories}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Standart kategoriyalarni qo'shish
          </Button>
        </motion.div>
      )}

      {/* Manage Mode - Show Delete Options */}
      {mode === 'manage' && categories.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Kategoriyalarni boshqarish:</p>
          <div className="space-y-2">
            {categories.map((category) => (
              <div 
                key={category.id}
                className="flex items-center justify-between p-3 rounded-xl bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{category.icon}</span>
                  <span className="font-medium">{category.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteCategory(category.id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManager;
