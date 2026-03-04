import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Zap, Brain, Trophy, ArrowRight, Loader2 } from 'lucide-react';
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

const LandingPage: React.FC = () => {
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleStartNow = async () => {
    setIsRedirecting(true);

    // Fire Meta Pixel Lead event
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'Lead');
    }

    try {
      const params = new URLSearchParams(window.location.search);
      const clickId = generateClickId();

      // Save to DB
      await supabase.from('ad_clicks' as any).insert({
        click_id: clickId,
        fbclid: params.get('fbclid') || null,
        utm_source: params.get('utm_source') || null,
        utm_medium: params.get('utm_medium') || null,
        utm_campaign: params.get('utm_campaign') || null,
        utm_content: params.get('utm_content') || null,
        utm_term: params.get('utm_term') || null,
        user_agent: navigator.userAgent || null,
      });

      // Redirect to Telegram bot with click_id
      window.location.href = `https://t.me/${BOT_USERNAME}?start=ad_${clickId}`;
    } catch (e) {
      console.error('Error saving click:', e);
      // Still redirect even if save fails
      window.location.href = `https://t.me/${BOT_USERNAME}`;
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
                  Bepul boshlash
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </Button>
            <p className="text-sm text-muted-foreground mt-3">
              Telegram orqali — ro'yxatdan o'tish shart emas
            </p>
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
              <p className="text-3xl font-bold text-primary">10,000+</p>
              <p className="text-sm text-muted-foreground">foydalanuvchilar</p>
            </div>
            <div className="w-px h-12 bg-border hidden sm:block" />
            <div>
              <p className="text-3xl font-bold text-primary">500,000+</p>
              <p className="text-sm text-muted-foreground">o'rganilgan so'zlar</p>
            </div>
            <div className="w-px h-12 bg-border hidden sm:block" />
            <div>
              <p className="text-3xl font-bold text-primary">⭐ 4.9</p>
              <p className="text-sm text-muted-foreground">reyting</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LandingPage;
