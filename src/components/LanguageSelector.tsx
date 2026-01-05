import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ChevronDown, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLearningLanguage } from '@/contexts/LearningLanguageContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

const languageNames: Record<string, Record<string, string>> = {
  uz: { uz: "O'zbekcha", ru: 'Узбекский', en: 'Uzbek' },
  ru: { uz: 'Ruscha', ru: 'Русский', en: 'Russian' },
  en: { uz: 'Inglizcha', ru: 'Английский', en: 'English' },
};

const languageFlags: Record<string, string> = {
  uz: '🇺🇿',
  ru: '🇷🇺',
  en: '🇬🇧',
};

interface LanguageSelectorProps {
  showAddNew?: boolean;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ showAddNew = true }) => {
  const { userLanguages, activeLanguage, setActiveLanguage, addLanguage, removeLanguage } = useLearningLanguage();
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newSource, setNewSource] = useState<string>('');
  const [newTarget, setNewTarget] = useState<string>('');

  const handleAddLanguage = async () => {
    if (!newSource || !newTarget) {
      toast.error('Iltimos, ikkala tilni tanlang');
      return;
    }

    if (newSource === newTarget) {
      toast.error('Tillar bir xil bo\'lmasligi kerak');
      return;
    }

    const exists = userLanguages.find(
      l => l.source_language === newSource && l.target_language === newTarget
    );

    if (exists) {
      toast.error('Bu til kombinatsiyasi allaqachon mavjud');
      return;
    }

    const result = await addLanguage(newSource, newTarget);
    if (result) {
      toast.success('Til qo\'shildi!');
      setIsAdding(false);
      setNewSource('');
      setNewTarget('');
    } else {
      toast.error('Xatolik yuz berdi');
    }
  };

  const handleRemoveLanguage = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (userLanguages.length === 1) {
      toast.error('Kamida bitta til bo\'lishi kerak');
      return;
    }
    
    if (confirm('Bu tilni o\'chirishni xohlaysizmi?')) {
      await removeLanguage(id);
      toast.success('Til o\'chirildi');
    }
  };

  if (userLanguages.length === 0 && !isAdding) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl shadow-card p-6 text-center"
      >
        <h3 className="font-medium text-lg mb-2">O'rganish tilini tanlang</h3>
        <p className="text-muted-foreground text-sm mb-4">
          Qaysi tilni o'rganmoqchisiz?
        </p>
        <Button onClick={() => setIsAdding(true)} className="gradient-primary text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" />
          Til qo'shish
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="relative">
      {/* Current Language Selector */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-card rounded-xl px-4 py-2.5 shadow-card hover:shadow-elevated transition-shadow w-full"
      >
        {activeLanguage && (
          <>
            <span className="text-lg">
              {languageFlags[activeLanguage.source_language]} → {languageFlags[activeLanguage.target_language]}
            </span>
            <span className="text-sm font-medium flex-1 text-left">
              {languageNames[activeLanguage.source_language][language]} → {languageNames[activeLanguage.target_language][language]}
            </span>
          </>
        )}
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-card rounded-xl shadow-elevated z-50 overflow-hidden"
          >
            {userLanguages.map((lang) => (
              <div
                key={lang.id}
                onClick={() => {
                  setActiveLanguage(lang);
                  setIsOpen(false);
                }}
                className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                  activeLanguage?.id === lang.id ? 'bg-primary/10' : 'hover:bg-muted'
                }`}
              >
                <span className="text-lg">
                  {languageFlags[lang.source_language]} → {languageFlags[lang.target_language]}
                </span>
                <span className="text-sm flex-1">
                  {languageNames[lang.source_language][language]} → {languageNames[lang.target_language][language]}
                </span>
                {activeLanguage?.id === lang.id && (
                  <Check className="w-4 h-4 text-primary" />
                )}
                {userLanguages.length > 1 && (
                  <button
                    onClick={(e) => handleRemoveLanguage(lang.id, e)}
                    className="p-1 hover:bg-destructive/10 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                )}
              </div>
            ))}

            {showAddNew && (
              <button
                onClick={() => {
                  setIsAdding(true);
                  setIsOpen(false);
                }}
                className="flex items-center gap-2 p-3 w-full text-primary hover:bg-primary/5 transition-colors border-t"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">Yangi til qo'shish</span>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add New Language Modal */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setIsAdding(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-2xl p-6 w-full max-w-sm shadow-elevated"
            >
              <h3 className="font-display font-semibold text-xl mb-4">Yangi til qo'shish</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Qaysi tildan:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['uz', 'ru', 'en'] as const).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setNewSource(lang)}
                        className={`p-3 rounded-xl text-center transition-all ${
                          newSource === lang
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted hover:bg-muted/80'
                        }`}
                      >
                        <span className="text-xl block">{languageFlags[lang]}</span>
                        <span className="text-xs">{languageNames[lang][language]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Qaysi tilga:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['uz', 'ru', 'en'] as const).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setNewTarget(lang)}
                        className={`p-3 rounded-xl text-center transition-all ${
                          newTarget === lang
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted hover:bg-muted/80'
                        }`}
                      >
                        <span className="text-xl block">{languageFlags[lang]}</span>
                        <span className="text-xs">{languageNames[lang][language]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setIsAdding(false)}
                  className="flex-1"
                >
                  Bekor qilish
                </Button>
                <Button
                  onClick={handleAddLanguage}
                  className="flex-1 gradient-primary text-primary-foreground"
                >
                  Qo'shish
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LanguageSelector;
