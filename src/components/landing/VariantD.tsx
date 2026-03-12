import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2, Smartphone, Star, Quote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLandingTracking } from '@/hooks/useLandingTracking';
import FallbackCard from './FallbackCard';

/** Variant D — Testimonial-heavy: social proof first, big testimonials */
const VariantD: React.FC = () => {
  const { isRedirecting, showFallback, hasTelegram, botUrl, qrCodeUrl, handleStartNow } =
    useLandingTracking('D');

  const testimonials = [
    { name: 'Sardor', text: "Kuniga 5 daqiqa sarflab, 1 oyda 200 ta yangi so'z yodladim. Leitner tizimi juda samarali!", rating: 5 },
    { name: 'Madina', text: "Oldin ilovalar yuklab, tashlab qo'yardim. Bu bot Telegramda ishlaydi — juda qulay!", rating: 5 },
    { name: 'Aziz', text: "Streak tizimi meni har kuni takrorlashga majbur qiladi. 30 kunlik streak borim! 🔥", rating: 5 },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero - compact with trust badges */}
      <div className="max-w-3xl mx-auto px-4 pt-16 pb-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 bg-accent/10 text-accent-foreground px-4 py-1.5 rounded-full text-sm font-medium mb-6 border border-accent/20"
        >
          <Star className="w-4 h-4 fill-accent text-accent" />
          O'zbekistonda #1 Leitner ilovasi
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="font-display font-bold text-4xl md:text-5xl text-foreground mb-4"
        >
          300+ kishi ishonadi — <br className="hidden md:block" />
          <span className="text-primary">siz ham sinab ko'ring</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-lg text-muted-foreground mb-6"
        >
          17,000+ so'z yodlangan · Bepul · Telegram ichida
        </motion.p>

        {/* CTA first */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
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
                  <><Smartphone className="w-5 h-5" />Bepul sinab ko'rish<ArrowRight className="w-5 h-5" /></>
                )}
              </Button>
              <p className="text-sm text-muted-foreground mt-3">Ro'yxatdan o'tish shart emas</p>
            </>
          ) : (
            <FallbackCard hasTelegram={hasTelegram} botUrl={botUrl} qrCodeUrl={qrCodeUrl} />
          )}
        </motion.div>
      </div>

      {/* Testimonials */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.12 }}
              className="bg-card rounded-2xl p-6 shadow-sm border border-border/50 relative"
            >
              <Quote className="w-8 h-8 text-primary/15 absolute top-4 right-4" />
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-accent text-accent" />
                ))}
              </div>
              <p className="text-foreground text-sm mb-4 leading-relaxed">{t.text}</p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                  {t.name[0]}
                </div>
                <span className="text-sm font-medium text-foreground">{t.name}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="max-w-3xl mx-auto px-4 pb-20 text-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="bg-primary/5 rounded-2xl p-8 border border-primary/10"
        >
          <h2 className="text-2xl font-bold text-foreground mb-2">Tayyor misiz?</h2>
          <p className="text-muted-foreground mb-6">Hoziroq boshlang — atigi 30 soniya</p>
          {!showFallback && (
            <Button
              onClick={handleStartNow}
              disabled={isRedirecting}
              size="lg"
              className="h-12 px-8 gradient-primary text-primary-foreground shadow-elevated gap-2"
            >
              {isRedirecting ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <><Smartphone className="w-5 h-5" />Boshlash<ArrowRight className="w-5 h-5" /></>
              )}
            </Button>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default VariantD;
