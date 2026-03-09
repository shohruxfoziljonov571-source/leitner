import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Zap, Brain, Trophy, ArrowRight, Loader2, Smartphone, Download, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

const BOT_USERNAME = 'Leitner_robot';

function generateClickId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function isTelegramInstalled(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  // Mobile devices likely have Telegram
  const isMobile = /android|iphone|ipad|ipod/i.test(ua);
  // Telegram WebView
  const isTgWebView = /tgweb/i.test(ua) || (window as any).Telegram;
  return isMobile || isTgWebView;
}

const sanitizeUtm = (value: string | null, maxLen = 256): string | null => {
  if (!value) return null;
  return value.slice(0, maxLen).replace(/[<>"'`;]/g, '');
};

const LandingPage: React.FC = () => {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [clickId, setClickId] = useState('');
  const hasTelegram = useMemo(() => isTelegramInstalled(), []);

  useEffect(() => {
    setClickId(generateClickId());
  }, []);

  const botUrl = `https://t.me/${BOT_USERNAME}?start=ad_${clickId}`;

  // Generate QR code URL using a free API
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(botUrl)}&bgcolor=ffffff&color=000000&format=svg`;

  const saveClick = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      await supabase.from('ad_clicks').insert({
        click_id: clickId,
        fbclid: sanitizeUtm(params.get('fbclid')),
        utm_source: sanitizeUtm(params.get('utm_source')),
        utm_medium: sanitizeUtm(params.get('utm_medium')),
        utm_campaign: sanitizeUtm(params.get('utm_campaign')),
        utm_content: sanitizeUtm(params.get('utm_content')),
        utm_term: sanitizeUtm(params.get('utm_term')),
        user_agent: (navigator.userAgent || '').slice(0, 512),
      });
    } catch (e) {
      console.error('Error saving click:', e);
    }
  };

  const handleStartNow = async () => {
    setIsRedirecting(true);

    // Fire Meta Pixel Lead event
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'Lead');
    }

    await saveClick();

    if (hasTelegram) {
      // Try deep link first
      window.location.href = botUrl;
      
      // If still on page after 2s, show fallback
      setTimeout(() => {
        setShowFallback(true);
        setIsRedirecting(false);
      }, 2000);
    } else {
      // Desktop or no Telegram — show instructions
      setShowFallback(true);
      setIsRedirecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.15),transparent_70%)]" />
        
        <div className="relative max-w-4xl mx-auto px-4 pt-16 pb-12 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 12 }}
            className="w-20 h-20 mx-auto mb-6 rounded-2xl gradient-primary flex items-center justify-center shadow-elevated"
          >
            <BookOpen className="w-10 h-10 text-primary-foreground" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="font-display font-bold text-4xl md:text-5xl text-foreground mb-4"
          >
            So'zlarni <span className="text-primary">2x tezroq</span> yodlang
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8"
          >
            Leitner tizimi + Telegram bot = eng samarali til o'rganish usuli.
            Har kuni 5 daqiqa ajratib, ingliz tilini o'zlashtirishni boshlang! 🚀
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            {!showFallback ? (
              <>
                <Button
                  onClick={handleStartNow}
                  disabled={isRedirecting}
                  size="lg"
                  className="h-14 px-8 text-lg gradient-primary text-primary-foreground shadow-elevated gap-2"
                >
                  {isRedirecting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Smartphone className="w-5 h-5" />
                      Bepul boshlash
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </Button>
                <p className="text-sm text-muted-foreground mt-3">
                  Telegram orqali — ro'yxatdan o'tish shart emas
                </p>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-card rounded-2xl p-6 shadow-card max-w-md mx-auto space-y-4"
              >
                {hasTelegram ? (
                  <>
                    <p className="text-foreground font-semibold">📱 Telegram ochilmadimi?</p>
                    <p className="text-sm text-muted-foreground">
                      Quyidagi tugmani bosib to'g'ridan-to'g'ri o'ting:
                    </p>
                    <a href={botUrl} target="_blank" rel="noopener noreferrer">
                      <Button size="lg" className="w-full gradient-primary text-primary-foreground gap-2">
                        <ArrowRight className="w-5 h-5" />
                        Telegram'da ochish
                      </Button>
                    </a>
                  </>
                ) : (
                  <>
                    <p className="text-foreground font-semibold">💻 Kompyuterdan kiryapsizmi?</p>
                    <p className="text-sm text-muted-foreground mb-2">
                      Telefoningiz bilan QR kodni skanerlang:
                    </p>
                    <div className="bg-white rounded-xl p-4 mx-auto w-fit">
                      <img
                        src={qrCodeUrl}
                        alt="QR Code to open Telegram bot"
                        width={180}
                        height={180}
                        className="rounded"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">yoki</p>
                    <div className="flex gap-2">
                      <a href={botUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                        <Button variant="outline" className="w-full gap-2">
                          <ArrowRight className="w-4 h-4" />
                          Telegram Web
                        </Button>
                      </a>
                      <a href="https://telegram.org/dl" target="_blank" rel="noopener noreferrer" className="flex-1">
                        <Button variant="outline" className="w-full gap-2">
                          <Download className="w-4 h-4" />
                          Yuklab olish
                        </Button>
                      </a>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Brain,
              title: 'Leitner tizimi',
              desc: 'Ilmiy asoslangan takrorlash metodi — har bir so\'zni optimal vaqtda takrorlang',
            },
            {
              icon: Zap,
              title: 'Telegram bot',
              desc: 'Ilovani yuklamasdan, to\'g\'ridan-to\'g\'ri Telegram ichida o\'rganing',
            },
            {
              icon: Trophy,
              title: 'Gamifikatsiya',
              desc: 'XP, streak, haftalik musobaqalar va do\'stlar bilan bellashish',
            },
          ].map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="bg-card rounded-2xl p-6 shadow-card text-center"
            >
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Social proof */}
      <div className="max-w-4xl mx-auto px-4 pb-16 text-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="bg-card rounded-2xl p-8 shadow-card"
        >
          <div className="flex items-center justify-center gap-8 flex-wrap">
            <div>
              <p className="text-3xl font-bold text-primary">300+</p>
              <p className="text-sm text-muted-foreground">foydalanuvchilar</p>
            </div>
            <div className="w-px h-12 bg-border hidden sm:block" />
            <div>
              <p className="text-3xl font-bold text-primary">17,000+</p>
              <p className="text-sm text-muted-foreground">o'rganilgan so'zlar</p>
            </div>
            <div className="w-px h-12 bg-border hidden sm:block" />
            <div>
              <p className="text-3xl font-bold text-primary">🇺🇿 #1</p>
              <p className="text-sm text-muted-foreground">Leitner ilovasi</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LandingPage;
