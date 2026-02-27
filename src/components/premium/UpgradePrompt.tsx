import React from 'react';
import { Crown, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Link } from 'react-router-dom';
import { usePremium } from '@/contexts/PremiumContext';

interface UpgradePromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: string;
  description?: string;
}

const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  open, onOpenChange, feature = 'Bu funksiya', description
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm text-center">
        <DialogHeader>
          <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-accent/20 flex items-center justify-center">
            <Crown className="w-8 h-8 text-accent" />
          </div>
          <DialogTitle>{feature} — Premium</DialogTitle>
          <DialogDescription>
            {description || `${feature} faqat Premium foydalanuvchilari uchun. Obuna bo'ling va barcha imkoniyatlardan foydalaning!`}
          </DialogDescription>
        </DialogHeader>
        <Link to="/premium" onClick={() => onOpenChange(false)}>
          <Button className="w-full gradient-primary text-primary-foreground mt-2" size="lg">
            <Crown className="w-4 h-4 mr-2" />
            Premium olish
          </Button>
        </Link>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Inline lock badge for premium features in lists
 */
export const PremiumLock: React.FC<{ label?: string }> = ({ label }) => {
  const { isPremium } = usePremium();
  if (isPremium) return null;

  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-accent font-medium bg-accent/10 px-1.5 py-0.5 rounded-full">
      <Lock className="w-2.5 h-2.5" />
      {label || 'PRO'}
    </span>
  );
};

export default UpgradePrompt;
