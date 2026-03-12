import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Zap, Brain, Trophy, ArrowRight, Loader2, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLandingTracking } from '@/hooks/useLandingTracking';
import FallbackCard from './FallbackCard';

/** Variant A — Original: Hero + 3 feature cards + social proof bar */
const VariantA: React.FC = () => {
  const { isRedirecting, showFallback, hasTelegram, botUrl, qrCodeUrl, handleStartNow } =
    useLandingTracking('A');

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10">
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
              <FallbackCard hasTelegram={hasTelegram} botUrl={botUrl} qrCodeUrl={qrCodeUrl} />
            )}
          </motion.div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Brain, title: 'Leitner tizimi', desc: "Ilmiy asoslangan takrorlash metodi — har bir so'zni optimal vaqtda takrorlang" },
            { icon: Zap, title: 'Telegram bot', desc: "Ilovani yuklamasdan, to'g'ridan-to'g'ri Telegram ichida o'rganing" },
            { icon: Trophy, title: 'Gamifikatsiya', desc: "XP, streak, haftalik musobaqalar va do'stlar bilan bellashish" },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="bg-card rounded-2xl p-6 shadow-sm text-center"
            >
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center">
                <f.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-16 text-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="bg-card rounded-2xl p-8 shadow-sm">
          <div className="flex items-center justify-center gap-8 flex-wrap">
            <div><p className="text-3xl font-bold text-primary">300+</p><p className="text-sm text-muted-foreground">foydalanuvchilar</p></div>
            <div className="w-px h-12 bg-border hidden sm:block" />
            <div><p className="text-3xl font-bold text-primary">17,000+</p><p className="text-sm text-muted-foreground">o'rganilgan so'zlar</p></div>
            <div className="w-px h-12 bg-border hidden sm:block" />
            <div><p className="text-3xl font-bold text-primary">🇺🇿 #1</p><p className="text-sm text-muted-foreground">Leitner ilovasi</p></div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default VariantA;
