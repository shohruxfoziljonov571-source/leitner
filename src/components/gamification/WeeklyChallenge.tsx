import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Users, Clock, ChevronRight, Zap, Target, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useWeeklyChallenge } from '@/hooks/useWeeklyChallenge';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const WeeklyChallenge: React.FC = () => {
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

  const handleJoin = async () => {
    const success = await joinChallenge();
    if (success) {
      toast.success('Challenge\'ga qo\'shildingiz! 🎉');
    } else {
      toast.error('Xatolik yuz berdi');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!challenge) {
    return null;
  }

  const top3 = participants.slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-red-500/10 rounded-2xl p-3 sm:p-5 border border-amber-500/20"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg flex-shrink-0">
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-base sm:text-lg truncate">Haftalik Challenge</h3>
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                {daysLeft} kun qoldi
              </span>
              <span className="hidden xs:inline">•</span>
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                {participants.length} ishtirokchi
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Top 3 Podium - Responsive */}
      {top3.length > 0 && (
        <div className="flex items-end justify-center gap-3 sm:gap-4 mb-3 sm:mb-4 py-2">
          {/* 2nd Place */}
          {top3[1] && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col items-center"
            >
              <Avatar className="w-9 h-9 sm:w-11 sm:h-11 border-2 border-gray-400 shadow-md">
                {top3[1].avatar_url && <AvatarImage src={top3[1].avatar_url} />}
                <AvatarFallback className="bg-gray-400 text-white text-xs sm:text-sm font-semibold">
                  {top3[1].full_name?.charAt(0)?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="mt-1.5 text-center">
                <p className="text-[11px] sm:text-xs font-medium text-foreground truncate max-w-[60px] sm:max-w-[80px]">
                  {top3[1].full_name?.split(' ')[0] || 'Foydalanuvchi'}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                  {top3[1].xp_earned} XP
                </p>
              </div>
              <div className="bg-gray-400/30 w-14 sm:w-16 h-10 sm:h-14 rounded-t-lg mt-1 flex items-center justify-center">
                <span className="text-lg sm:text-xl">🥈</span>
              </div>
            </motion.div>
          )}

          {/* 1st Place */}
          {top3[0] && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center -mt-2"
            >
              <Avatar className="w-11 h-11 sm:w-14 sm:h-14 border-2 border-amber-500 ring-2 ring-amber-400/40 shadow-lg">
                {top3[0].avatar_url && <AvatarImage src={top3[0].avatar_url} />}
                <AvatarFallback className="bg-gradient-to-br from-amber-400 to-amber-600 text-white text-sm sm:text-base font-bold">
                  {top3[0].full_name?.charAt(0)?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="mt-1.5 text-center">
                <p className="text-xs sm:text-sm font-semibold text-foreground truncate max-w-[70px] sm:max-w-[90px]">
                  {top3[0].full_name?.split(' ')[0] || 'Foydalanuvchi'}
                </p>
                <p className="text-[10px] sm:text-xs text-amber-600 font-bold">
                  {top3[0].xp_earned} XP
                </p>
              </div>
              <div className="bg-amber-500/30 w-16 sm:w-20 h-14 sm:h-20 rounded-t-lg mt-1 flex items-center justify-center">
                <span className="text-xl sm:text-2xl">👑</span>
              </div>
            </motion.div>
          )}

          {/* 3rd Place */}
          {top3[2] && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col items-center"
            >
              <Avatar className="w-8 h-8 sm:w-10 sm:h-10 border-2 border-amber-700 shadow-md">
                {top3[2].avatar_url && <AvatarImage src={top3[2].avatar_url} />}
                <AvatarFallback className="bg-amber-700 text-white text-[10px] sm:text-xs font-semibold">
                  {top3[2].full_name?.charAt(0)?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="mt-1.5 text-center">
                <p className="text-[10px] sm:text-xs font-medium text-foreground truncate max-w-[55px] sm:max-w-[70px]">
                  {top3[2].full_name?.split(' ')[0] || 'Foydalanuvchi'}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                  {top3[2].xp_earned} XP
                </p>
              </div>
              <div className="bg-amber-700/30 w-12 sm:w-14 h-8 sm:h-10 rounded-t-lg mt-1 flex items-center justify-center">
                <span className="text-base sm:text-lg">🥉</span>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* User Status / Join Button */}
      {userParticipation ? (
        <div className="bg-card/50 backdrop-blur rounded-lg sm:rounded-xl p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="font-bold text-primary text-sm sm:text-base">#{userRank}</span>
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm sm:text-base">Sizning o'rningiz</p>
                <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500" />
                    {userParticipation.xp_earned} XP
                  </span>
                  <span className="flex items-center gap-1">
                    <Target className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-500" />
                    {userParticipation.words_reviewed} so'z
                  </span>
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground flex-shrink-0" />
          </div>
        </div>
      ) : (
        <Button
          onClick={handleJoin}
          className="w-full gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg"
        >
          <Trophy className="w-4 h-4" />
          Challenge'ga qo'shilish
        </Button>
      )}

      {/* Info */}
      {!userParticipation && (
        <p className="text-xs text-center text-muted-foreground mt-3">
          Bu hafta eng ko'p XP yig'ing va g'olib bo'ling! 🏆
        </p>
      )}
    </motion.div>
  );
};

export default WeeklyChallenge;
