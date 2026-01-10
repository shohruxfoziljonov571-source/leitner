import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChallengeRewards } from '@/hooks/useChallengeRewards';
import ChallengeRewardBadge from './ChallengeRewardBadge';

const UnclaimedRewards: React.FC = () => {
  const { unclaimedRewards, claimReward } = useChallengeRewards();

  if (unclaimedRewards.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="mb-6"
      >
        <div className="bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 rounded-2xl p-4 border border-primary/30">
          <div className="flex items-center gap-2 mb-3">
            <Gift className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">
              Olinmagan sovg'alar ({unclaimedRewards.length})
            </h3>
            <Sparkles className="w-4 h-4 text-yellow-500 animate-pulse" />
          </div>

          <div className="space-y-3">
            {unclaimedRewards.map((reward) => (
              <motion.div
                key={reward.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between bg-card/80 rounded-xl p-3"
              >
                <div className="flex items-center gap-3">
                  <ChallengeRewardBadge type={reward.badge_type} size="sm" animate />
                  <div>
                    <p className="font-medium text-foreground">
                      Haftalik challenge - {reward.rank === 1 ? '1-o\'rin' : reward.rank === 2 ? '2-o\'rin' : '3-o\'rin'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      +{reward.bonus_xp} XP bonus
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => claimReward(reward.id)}
                  className="gap-1"
                >
                  <Gift className="w-4 h-4" />
                  Olish
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default UnclaimedRewards;
