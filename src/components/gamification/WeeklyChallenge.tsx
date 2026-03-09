import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Users, Clock, ChevronRight, Zap, Target, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useWeeklyChallenge } from '@/hooks/useWeeklyChallenge';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

const WeeklyChallenge = React.forwardRef<HTMLDivElement>((_, ref) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const {
    challenge,
    participants,
    userParticipation,
    userRank,
    daysLeft,
    isLoading,
    joinChallenge,
  } = useWeeklyChallenge();

  const top3 = useMemo(() => participants.slice(0, 3), [participants]);

  const handleJoin = async () => {
    const success = await joinChallenge();
    if (success) {
      toast.success(t('challengeJoined') + ' 🎉');
    } else {
      toast.error('Error');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!challenge) {
    return null;
  }

  return (
    <div className="bg-card rounded-xl p-4 shadow-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-accent" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">{t('weeklyChallenge')}</h3>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-0.5">
                <Clock className="w-3 h-3" />
                {t('daysLeft').replace('{count}', String(daysLeft))}
              </span>
              <span>•</span>
              <span className="flex items-center gap-0.5">
                <Users className="w-3 h-3" />
                {participants.length}
              </span>
            </div>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>

      {/* Top 3 compact */}
      {top3.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {top3.map((p, i) => (
            <div key={p.user_id} className="flex items-center gap-2 py-1">
              <span className="text-sm w-5 text-center">
                {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
              </span>
              <Avatar className="w-6 h-6">
                {p.avatar_url && <AvatarImage src={p.avatar_url} />}
                <AvatarFallback className="text-[10px] bg-muted">
                  {p.full_name?.charAt(0)?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium text-foreground flex-1 truncate">
                {p.full_name?.split(' ')[0] || 'Foydalanuvchi'}
              </span>
              <span className="text-[11px] text-muted-foreground font-medium">{p.xp_earned} XP</span>
            </div>
          ))}
        </div>
      )}

      {/* User Status / Join */}
      {userParticipation ? (
        <div className="bg-muted/50 rounded-lg p-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-primary text-sm">#{userRank}</span>
            <div className="text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-0.5"><Zap className="w-3 h-3 text-accent" />{userParticipation.xp_earned} XP</span>
              <span className="mx-1.5">•</span>
              <span className="inline-flex items-center gap-0.5"><Target className="w-3 h-3 text-primary" />{userParticipation.words_reviewed}</span>
            </div>
          </div>
        </div>
      ) : (
        <Button
          onClick={handleJoin}
          size="sm"
          className="w-full gap-1.5 gradient-primary text-primary-foreground text-xs h-9"
        >
          <Trophy className="w-3.5 h-3.5" />
          {t('joinChallenge')}
        </Button>
      )}
    </div>
  );
});

WeeklyChallenge.displayName = 'WeeklyChallenge';

export default React.memo(WeeklyChallenge);
