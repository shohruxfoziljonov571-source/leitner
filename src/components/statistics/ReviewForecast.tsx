import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, TrendingUp } from 'lucide-react';
import { useWordsDB } from '@/hooks/useWordsDB';
import { useLanguage } from '@/contexts/LanguageContext';

const ReviewForecast: React.FC = () => {
  const { words } = useWordsDB();
  const { t } = useLanguage();

  const forecast = useMemo(() => {
    const days: { date: string; label: string; count: number }[] = [];
    const now = new Date();

    for (let i = 0; i < 7; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const dayStart = new Date(dateStr).getTime();
      const dayEnd = dayStart + 86400000;

      const count = words.filter(w => {
        const reviewTime = new Date(w.next_review_time).getTime();
        return reviewTime >= dayStart && reviewTime < dayEnd;
      }).length;

      const dayNames: Record<string, string[]> = {
        uz: ['Bugun', 'Ertaga', 'Indinga'],
        ru: ['Сегодня', 'Завтра', 'Послезавтра'],
        en: ['Today', 'Tomorrow', 'Day after'],
      };
      const lang = 'uz'; // fallback

      const label = i < 3
        ? (dayNames[lang]?.[i] || date.toLocaleDateString('uz', { weekday: 'short' }))
        : date.toLocaleDateString('uz', { weekday: 'short', day: 'numeric' });

      days.push({ date: dateStr, label, count });
    }

    return days;
  }, [words]);

  const maxCount = Math.max(...forecast.map(d => d.count), 1);

  if (words.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-3xl shadow-card p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-5 h-5 text-primary" />
        <h3 className="font-display font-semibold text-lg">
          {t('reviewForecast') || "Takrorlash rejasi"}
        </h3>
      </div>

      <p className="text-xs text-muted-foreground mb-4">
        {t('forecastDescription') || "Kelgusi 7 kun ichida nechta so'z takrorlanishi kerak"}
      </p>

      <div className="flex items-end gap-2 h-32">
        {forecast.map((day, i) => {
          const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
          return (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs font-medium text-foreground">{day.count}</span>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(height, 4)}%` }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="w-full rounded-t-lg"
                style={{
                  backgroundColor: i === 0
                    ? 'hsl(var(--primary))'
                    : i === 1
                    ? 'hsl(var(--primary) / 0.7)'
                    : 'hsl(var(--primary) / 0.4)',
                  minHeight: '4px',
                }}
              />
              <span className="text-[10px] text-muted-foreground text-center leading-tight">
                {day.label}
              </span>
            </div>
          );
        })}
      </div>

      {forecast[0]?.count > 0 && (
        <div className="mt-4 flex items-center gap-2 p-3 bg-primary/10 rounded-xl">
          <TrendingUp className="w-4 h-4 text-primary flex-shrink-0" />
          <p className="text-xs text-foreground">
            <span className="font-semibold">{t('today') || 'Bugun'}: </span>
            {forecast[0].count} ta so'z takrorlashni kutmoqda
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default React.memo(ReviewForecast);
