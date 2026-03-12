import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2, Smartphone, CheckCircle2, Clock, Target, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLandingTracking } from '@/hooks/useLandingTracking';
import FallbackCard from './FallbackCard';

/** Variant B — Problem/Solution: pain points → solution → CTA */
const VariantB: React.FC = () => {
  const { isRedirecting, showFallback, hasTelegram, botUrl, qrCodeUrl, handleStartNow } =
    useLandingTracking('B');

  const problems = [
    { icon: Clock, text: "So'zlarni yodlab, ertasiga unutasizmi?" },
    { icon: Target, text: "Qaysi so'zni qachon takrorlashni bilmaysizmi?" },
    { icon: TrendingUp, text: "Motivatsiya yo'qolib, tashlab qo'yasizmi?" },
  ];

  const solutions = [
    "Leitner tizimi yodlashni 2x samarali qiladi",
    "Bot sizga kerakli vaqtda eslatma yuboradi",
    "XP va streak tizimi motivatsiyani oshiradi",
    "Ro'yxatdan o'tish shart emas — faqat /start",
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Pain Section */}
      <div className="bg-destructive/5 border-b border-destructive/10">
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm font-medium text-destructive mb-4 uppercase tracking-wide"
          >
            Tanish muammo
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-display font-bold text-3xl md:text-5xl text-foreground mb-10"
          >
            Ingliz tili so'zlarini yodlash <br className="hidden md:block" />
            <span className="text-destructive">qiyin emasmi?</span>
          </motion.h1>

          <div className="grid md:grid-cols-3 gap-6">
            {problems.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="bg-card rounded-xl p-5 shadow-sm border border-destructive/10"
              >
                <p.icon className="w-8 h-8 text-destructive mx-auto mb-3" />
                <p className="text-foreground font-medium">{p.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Solution Section */}
      <div className="max-w-3xl mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center mb-10"
        >
          <p className="text-sm font-medium text-primary mb-2 uppercase tracking-wide">Yechim</p>
          <h2 className="font-display font-bold text-3xl md:text-4xl text-foreground">
            Leitner Bot — <span className="text-primary">aqlli yodlash</span>
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-card rounded-2xl p-8 shadow-sm mb-10"
        >
          <ul className="space-y-4">
            {solutions.map((s, i) => (
              <li key={i} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <span className="text-foreground">{s}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="flex justify-center gap-10 mb-10 text-center"
        >
          <div><p className="text-2xl font-bold text-primary">300+</p><p className="text-xs text-muted-foreground">foydalanuvchi</p></div>
          <div><p className="text-2xl font-bold text-primary">17K+</p><p className="text-xs text-muted-foreground">so'z yodlangan</p></div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-center"
        >
          {!showFallback ? (
            <>
              <Button
                onClick={handleStartNow}
                disabled={isRedirecting}
                size="lg"
                className="h-14 px-10 text-lg gradient-primary text-primary-foreground shadow-elevated gap-2"
              >
                {isRedirecting ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <><Smartphone className="w-5 h-5" />Hoziroq boshlash<ArrowRight className="w-5 h-5" /></>
                )}
              </Button>
              <p className="text-sm text-muted-foreground mt-3">Bepul · Telegram orqali · 30 soniyada</p>
            </>
          ) : (
            <FallbackCard hasTelegram={hasTelegram} botUrl={botUrl} qrCodeUrl={qrCodeUrl} />
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default VariantB;
