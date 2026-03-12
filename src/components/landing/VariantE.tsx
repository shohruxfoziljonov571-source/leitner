import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2, Smartphone, Flame, Timer, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLandingTracking } from '@/hooks/useLandingTracking';
import FallbackCard from './FallbackCard';

/** Variant E — Urgency / Minimalist: bold headline, countdown feel, single CTA */
const VariantE: React.FC = () => {
  const { isRedirecting, showFallback, hasTelegram, botUrl, qrCodeUrl, handleStartNow } =
    useLandingTracking('E');

  return (
    <div className="min-h-screen bg-foreground flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.15),transparent_60%)]" />
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />

      <div className="relative z-10 max-w-2xl text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring' }}
          className="inline-flex items-center gap-2 bg-primary/20 px-4 py-2 rounded-full mb-8"
        >
          <Flame className="w-5 h-5 text-primary" />
          <span className="text-primary font-semibold text-sm">300+ kishi allaqachon o'rganmoqda</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="font-display font-bold text-5xl md:text-7xl text-background mb-6 leading-tight"
        >
          5 daqiqa.
          <br />
          <span className="text-primary">Har kuni.</span>
          <br />
          Natija.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-lg text-background/60 mb-10 max-w-md mx-auto"
        >
          Telegram ichida ingliz tili so'zlarini Leitner tizimi bilan yodlang.
          Ilova yuklamasdan. Pul to'lamasdan.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          {!showFallback ? (
            <>
              <Button
                onClick={handleStartNow}
                disabled={isRedirecting}
                size="lg"
                className="h-16 px-12 text-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_40px_hsl(var(--primary)/0.4)] gap-3 rounded-xl"
              >
                {isRedirecting ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                  <>
                    <Smartphone className="w-6 h-6" />
                    Hoziroq boshlash
                    <ArrowRight className="w-6 h-6" />
                  </>
                )}
              </Button>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex items-center justify-center gap-6 mt-8 text-background/40"
              >
                <div className="flex items-center gap-1.5 text-sm">
                  <Timer className="w-4 h-4" />
                  30 soniyada tayyor
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <Zap className="w-4 h-4" />
                  Bepul
                </div>
              </motion.div>
            </>
          ) : (
            <FallbackCard hasTelegram={hasTelegram} botUrl={botUrl} qrCodeUrl={qrCodeUrl} />
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default VariantE;
