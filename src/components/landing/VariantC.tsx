import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2, Smartphone, MessageCircle, Repeat, Award, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLandingTracking } from '@/hooks/useLandingTracking';
import FallbackCard from './FallbackCard';

/** Variant C — Steps / How it works: numbered steps + single CTA */
const VariantC: React.FC = () => {
  const { isRedirecting, showFallback, hasTelegram, botUrl, qrCodeUrl, handleStartNow } =
    useLandingTracking('C');

  const steps = [
    { num: '1', icon: MessageCircle, title: 'Telegram botni oching', desc: "/start tugmasini bosing — ro'yxatdan o'tish kerak emas" },
    { num: '2', icon: BookOpen, title: "So'zlarni qo'shing", desc: "Inglizcha-o'zbekcha so'z juftliklarini kiritib boring" },
    { num: '3', icon: Repeat, title: 'Har kuni takrorlang', desc: "Bot sizga 5 daqiqalik quiz yuboradi — optimal vaqtda" },
    { num: '4', icon: Award, title: "Natijani ko'ring", desc: "XP yig'ing, streak oshiring va do'stlar bilan bellashing" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero - compact */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="relative max-w-3xl mx-auto px-4 pt-20 pb-8 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display font-bold text-4xl md:text-5xl text-foreground mb-3"
          >
            Ingliz tilini <span className="text-primary">Telegram</span>da o'rganing
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="text-lg text-muted-foreground"
          >
            4 oddiy qadamda — ilova yuklamasdan
          </motion.p>
        </div>
      </div>

      {/* Steps */}
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border hidden md:block" />

          <div className="space-y-8">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.15 }}
                className="flex items-start gap-5"
              >
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold shrink-0 relative z-10">
                  {step.num}
                </div>
                <div className="bg-card rounded-xl p-5 shadow-sm flex-1 border border-border/50">
                  <div className="flex items-center gap-2 mb-1">
                    <step.icon className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold text-foreground">{step.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats + CTA */}
      <div className="max-w-2xl mx-auto px-4 pb-20 text-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="flex justify-center gap-8 mb-8"
        >
          <div className="bg-primary/5 rounded-xl px-6 py-3">
            <p className="text-xl font-bold text-primary">300+</p>
            <p className="text-xs text-muted-foreground">foydalanuvchi</p>
          </div>
          <div className="bg-primary/5 rounded-xl px-6 py-3">
            <p className="text-xl font-bold text-primary">17K+</p>
            <p className="text-xs text-muted-foreground">so'z</p>
          </div>
          <div className="bg-primary/5 rounded-xl px-6 py-3">
            <p className="text-xl font-bold text-primary">#1</p>
            <p className="text-xs text-muted-foreground">O'zbekiston</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
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
                  <><Smartphone className="w-5 h-5" />Bepul boshlash<ArrowRight className="w-5 h-5" /></>
                )}
              </Button>
              <p className="text-sm text-muted-foreground mt-3">Telegram orqali — 30 soniyada tayyor</p>
            </>
          ) : (
            <FallbackCard hasTelegram={hasTelegram} botUrl={botUrl} qrCodeUrl={qrCodeUrl} />
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default VariantC;
