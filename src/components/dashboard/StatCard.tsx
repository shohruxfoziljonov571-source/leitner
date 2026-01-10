import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subtext?: string;
  gradient?: boolean;
  delay?: number;
}

const StatCard: React.FC<StatCardProps> = memo(({
  icon: Icon,
  label,
  value,
  subtext,
  gradient = false,
  delay = 0,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay }}
      className={`rounded-2xl p-5 ${
        gradient
          ? 'gradient-primary text-primary-foreground'
          : 'bg-card shadow-card'
      }`}
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
          gradient ? 'bg-primary-foreground/20' : 'bg-primary/10'
        }`}
      >
        <Icon
          className={`w-5 h-5 ${gradient ? 'text-primary-foreground' : 'text-primary'}`}
        />
      </div>

      <p
        className={`text-sm mb-1 ${
          gradient ? 'text-primary-foreground/80' : 'text-muted-foreground'
        }`}
      >
        {label}
      </p>

      <div className="flex items-baseline gap-2">
        <span className="font-display font-bold text-2xl">{value}</span>
        {subtext && (
          <span
            className={`text-sm ${
              gradient ? 'text-primary-foreground/70' : 'text-muted-foreground'
            }`}
          >
            {subtext}
          </span>
        )}
      </div>
    </motion.div>
  );
});

StatCard.displayName = 'StatCard';

export default StatCard;
