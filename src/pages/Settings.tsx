import React from 'react';
import { motion } from 'framer-motion';
import { Languages, Moon, Bell, Info, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useLanguage, Language } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

const Settings: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();

  const languages: { code: Language; name: string; flag: string }[] = [
    { code: 'uz', name: "O'zbekcha", flag: '🇺🇿' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
  ];

  const handleClearData = () => {
    if (confirm("Barcha ma'lumotlarni o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi!")) {
      localStorage.removeItem('leitner-words');
      localStorage.removeItem('leitner-stats');
      toast.success("Ma'lumotlar o'chirildi");
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen pb-24 md:pt-24 md:pb-8">
      <div className="container mx-auto px-4 py-6 max-w-lg">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="font-display font-bold text-3xl text-foreground mb-2">
            {t('settings')} ⚙️
          </h1>
          <p className="text-muted-foreground">Ilovani sozlash</p>
        </motion.div>

        {/* Language Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl shadow-card p-5 mb-4"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Languages className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">{t('interfaceLanguage')}</h3>
              <p className="text-sm text-muted-foreground">Ilova tilini tanlang</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code)}
                className={`p-3 rounded-xl text-center transition-all ${
                  language === lang.code
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                <span className="text-2xl block mb-1">{lang.flag}</span>
                <span className="text-xs font-medium">{lang.name}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-2xl shadow-card p-5 mb-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="font-medium">{t('notifications')}</h3>
                <p className="text-sm text-muted-foreground">Eslatmalarni yoqish</p>
              </div>
            </div>
            <Switch />
          </div>
        </motion.div>

        {/* About */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-2xl shadow-card p-5 mb-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
              <Info className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <h3 className="font-medium">Leitner App</h3>
              <p className="text-sm text-muted-foreground">Versiya 1.0.0 • MVP</p>
            </div>
          </div>
        </motion.div>

        {/* Clear Data */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-destructive/5 border border-destructive/20 rounded-2xl p-5"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h3 className="font-medium text-destructive">Ma'lumotlarni tozalash</h3>
              <p className="text-sm text-muted-foreground">
                Barcha so'zlar va statistikani o'chirish
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleClearData}
            className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            O'chirish
          </Button>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-sm text-muted-foreground mt-8"
        >
          Leitner tizimi bilan samarali o'rganing 🚀
        </motion.p>
      </div>
    </div>
  );
};

export default Settings;
