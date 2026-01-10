import React, { memo, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';

interface BoxCardProps {
  boxNumber: 1 | 2 | 3 | 4 | 5;
  wordCount: number;
  totalWords: number;
  delay?: number;
}

const boxDescriptions = {
  1: 'box1Desc',
  2: 'box2Desc',
  3: 'box3Desc',
  4: 'box4Desc',
  5: 'box5Desc',
};

const BoxCard = memo(forwardRef<HTMLDivElement, BoxCardProps>(({ boxNumber, wordCount, totalWords, delay = 0 }, ref) => {
  const { t } = useLanguage();
  const progress = totalWords > 0 ? (wordCount / totalWords) * 100 : 0;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="relative overflow-hidden rounded-2xl bg-card shadow-card p-5 group hover:shadow-elevated transition-shadow duration-300"
    >
      {/* Box number badge */}
      <div
        className={`absolute top-4 right-4 w-10 h-10 rounded-xl flex items-center justify-center font-display font-bold text-lg`}
        style={{
          backgroundColor: `hsl(var(--box-${boxNumber}) / 0.15)`,
          color: `hsl(var(--box-${boxNumber}))`,
        }}
      >
        {boxNumber}
      </div>

      {/* Content */}
      <div className="mb-4">
        <h3 className="font-display font-semibold text-foreground text-lg mb-1">
          {t('box')} {boxNumber}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t(boxDescriptions[boxNumber])}
        </p>
      </div>

      {/* Word count */}
      <div className="flex items-baseline gap-2 mb-3">
        <span className="font-display font-bold text-3xl text-foreground">{wordCount}</span>
        <span className="text-muted-foreground text-sm">{t('words')}</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.6, delay: delay + 0.2 }}
          className="h-full rounded-full"
          style={{ backgroundColor: `hsl(var(--box-${boxNumber}))` }}
        />
      </div>
    </motion.div>
  );
}));

BoxCard.displayName = 'BoxCard';

export default BoxCard;
