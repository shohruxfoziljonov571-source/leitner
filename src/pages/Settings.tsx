import React from 'react';
import { motion } from 'framer-motion';
import { Languages, Bell, Info, LogOut, User, Moon, Sun, Monitor, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useLanguage, Language } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import CategoryManager from '@/components/CategoryManager';
import NotificationSettings from '@/components/NotificationSettings';

const Settings: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();
  const { user, signOut } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const languages: { code: Language; name: string; flag: string }[] = [
    { code: 'uz', name: "O'zbekcha", flag: '🇺🇿' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
  ];

  const themes: { value: 'light' | 'dark' | 'system'; label: string; icon: React.ElementType }[] = [
    { value: 'light', label: 'Yorug\'', icon: Sun },
    { value: 'dark', label: 'Qorong\'i', icon: Moon },
    { value: 'system', label: 'Tizim', icon: Monitor },
  ];

  const handleSignOut = async () => {
    if (confirm("Hisobdan chiqmoqchimisiz?")) {
      await signOut();
      toast.success("Hisobdan chiqdingiz");
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

        {/* User Info / Profile Link */}
        <Link to="/profile">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-card rounded-2xl shadow-card p-5 mb-4 hover:shadow-elevated transition-shadow cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center">
                <User className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">{user?.email}</h3>
                <p className="text-sm text-muted-foreground">Profilni ko'rish →</p>
              </div>
            </div>
          </motion.div>
        </Link>

        {/* Theme Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl shadow-card p-5 mb-4"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
              {resolvedTheme === 'dark' ? (
                <Moon className="w-5 h-5 text-secondary" />
              ) : (
                <Sun className="w-5 h-5 text-secondary" />
              )}
            </div>
            <div>
              <h3 className="font-medium">Mavzu</h3>
              <p className="text-sm text-muted-foreground">Ilova ko'rinishini tanlang</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {themes.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.value}
                  onClick={() => setTheme(t.value)}
                  className={`p-3 rounded-xl text-center transition-all flex flex-col items-center gap-2 ${
                    theme === t.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{t.label}</span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Language Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
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

        {/* Categories */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-2xl shadow-card p-5 mb-4"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Folder className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="font-medium">Kategoriyalar</h3>
              <p className="text-sm text-muted-foreground">So'zlarni guruhlang</p>
            </div>
          </div>
          <CategoryManager mode="manage" />
        </motion.div>

        {/* Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-card rounded-2xl shadow-card p-5 mb-4"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">Bildirishnomalar</h3>
              <p className="text-sm text-muted-foreground">Kunlik eslatmalar</p>
            </div>
          </div>
          <NotificationSettings />
        </motion.div>

        {/* About */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-card rounded-2xl shadow-card p-5 mb-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Info className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="font-medium">Leitner App</h3>
              <p className="text-sm text-muted-foreground">Versiya 2.0.0 • Cloud Edition</p>
            </div>
          </div>
        </motion.div>

        {/* Sign Out */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-destructive/5 border border-destructive/20 rounded-2xl p-5"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <LogOut className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h3 className="font-medium text-destructive">Hisobdan chiqish</h3>
              <p className="text-sm text-muted-foreground">
                Ilovadan chiqish
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Chiqish
          </Button>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="text-center text-sm text-muted-foreground mt-8"
        >
          Leitner tizimi bilan samarali o'rganing 🚀
        </motion.p>
      </div>
    </div>
  );
};

export default Settings;
