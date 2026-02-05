import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Plus, BookOpen, Settings, Languages, Users, Brain, TrendingUp, MoreHorizontal } from 'lucide-react';
import { useLanguage, Language } from '@/contexts/LanguageContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const Navigation: React.FC = () => {
  const location = useLocation();
  const { t, language, setLanguage } = useLanguage();

  // Primary nav items (always visible)
  const primaryNavItems = useMemo(() => ([
    { path: '/', icon: Home, label: 'dashboard' },
    { path: '/add', icon: Plus, label: 'addWord' },
    { path: '/learn', icon: BookOpen, label: 'learn' },
    { path: '/friends', icon: Users, label: 'friends' },
  ]), []);

  // Secondary nav items (in "more" menu on mobile)
  const secondaryNavItems = useMemo(() => ([
    { path: '/stats', icon: TrendingUp, label: 'statistics' },
    { path: '/mnemonics', icon: Brain, label: 'mnemonics' },
    { path: '/settings', icon: Settings, label: 'settings' },
  ]), []);

  // All items for desktop
  const allNavItems = useMemo(() => [...primaryNavItems, ...secondaryNavItems], [primaryNavItems, secondaryNavItems]);

  const languages: { code: Language; name: string; flag: string }[] = useMemo(() => ([
    { code: 'uz', name: "O'zbekcha", flag: '🇺🇿' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
  ]), [ ]);

  const isSecondaryActive = secondaryNavItems.some(item => location.pathname === item.path);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border z-fixed md:top-0 md:bottom-auto md:border-t-0 md:border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo - Desktop only */}
          <Link to="/" className="hidden md:flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl text-foreground">Leitner</span>
          </Link>

          {/* Nav Items - Mobile (limited) */}
          <div className="flex items-center justify-around w-full md:hidden">
            {primaryNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="relative flex flex-col items-center gap-1 p-2 rounded-xl transition-colors group"
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute inset-0 bg-primary/10 rounded-xl"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <Icon
                    className={`w-5 h-5 relative z-10 transition-colors ${
                      isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                    }`}
                  />
                </Link>
              );
            })}

            {/* More menu for mobile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`relative flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${
                    isSecondaryActive ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {isSecondaryActive && (
                    <motion.div
                      layoutId="activeNavMore"
                      className="absolute inset-0 bg-primary/10 rounded-xl"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <MoreHorizontal className="w-5 h-5 relative z-10" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 mb-2">
                {secondaryNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <DropdownMenuItem key={item.path} asChild>
                      <Link
                        to={item.path}
                        className={`flex items-center gap-2 ${isActive ? 'text-primary font-medium' : ''}`}
                      >
                        <Icon className="w-4 h-4" />
                        {t(item.label)}
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator />
                {/* Language selector in mobile menu */}
                <div className="px-2 py-1.5">
                  <p className="text-xs text-muted-foreground mb-2">Til</p>
                  <div className="flex gap-1">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => setLanguage(lang.code)}
                        className={`flex-1 p-2 rounded-lg text-center transition-colors ${
                          language === lang.code 
                            ? 'bg-primary/10 text-primary' 
                            : 'hover:bg-muted'
                        }`}
                      >
                        {lang.flag}
                      </button>
                    ))}
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Nav Items - Desktop (all items) */}
          <div className="hidden md:flex items-center gap-2">
            {allNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="relative flex flex-col items-center gap-1 p-3 rounded-xl transition-colors group"
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNavDesktop"
                      className="absolute inset-0 bg-primary/10 rounded-xl"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <Icon
                    className={`w-6 h-6 relative z-10 transition-colors ${
                      isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                    }`}
                  />
                  <span
                    className={`text-xs relative z-10 transition-colors ${
                      isActive ? 'text-primary font-medium' : 'text-muted-foreground'
                    }`}
                  >
                    {t(item.label)}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Language Selector - Desktop */}
          <div className="hidden md:block">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Languages className="w-4 h-4" />
                  {languages.find((l) => l.code === language)?.flag}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {languages.map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={language === lang.code ? 'bg-primary/10' : ''}
                  >
                    <span className="mr-2">{lang.flag}</span>
                    {lang.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default React.memo(Navigation);
