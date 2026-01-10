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
      className="bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-red-500/10 rounded-2xl p-5 border border-amber-500/20"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Haftalik Challenge</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>{daysLeft} kun qoldi</span>
              <span>•</span>
              <Users className="w-3.5 h-3.5" />
              <span>{participants.length} ishtirokchi</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top 3 Podium */}
      {top3.length > 0 && (
        <div className="flex items-end justify-center gap-2 mb-4 h-32">
          {/* 2nd Place */}
          {top3[1] && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col items-center"
            >
              <Avatar className="w-10 h-10 border-2 border-gray-400">
                {top3[1].avatar_url && <AvatarImage src={top3[1].avatar_url} />}
                <AvatarFallback className="bg-gray-400 text-white text-xs">
                  {top3[1].full_name?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="bg-gray-400 text-white text-xs font-bold px-2 py-1 rounded-t mt-1">
                🥈
              </div>
              <div className="bg-gray-400/20 w-16 h-16 rounded-t flex flex-col items-center justify-center">
                <span className="text-xs font-medium truncate max-w-14">{top3[1].full_name?.split(' ')[0]}</span>
                <span className="text-xs text-muted-foreground">{top3[1].xp_earned} XP</span>
              </div>
            </motion.div>
          )}

          {/* 1st Place */}
          {top3[0] && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center"
            >
              <Avatar className="w-12 h-12 border-2 border-amber-500 ring-2 ring-amber-500/30">
                {top3[0].avatar_url && <AvatarImage src={top3[0].avatar_url} />}
                <AvatarFallback className="bg-amber-500 text-white">
                  {top3[0].full_name?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="bg-amber-500 text-white text-sm font-bold px-3 py-1 rounded-t mt-1">
                👑
              </div>
              <div className="bg-amber-500/20 w-20 h-24 rounded-t flex flex-col items-center justify-center">
                <span className="text-sm font-medium truncate max-w-18">{top3[0].full_name?.split(' ')[0]}</span>
                <span className="text-xs font-bold text-amber-600">{top3[0].xp_earned} XP</span>
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
              <Avatar className="w-9 h-9 border-2 border-amber-700">
                {top3[2].avatar_url && <AvatarImage src={top3[2].avatar_url} />}
                <AvatarFallback className="bg-amber-700 text-white text-xs">
                  {top3[2].full_name?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="bg-amber-700 text-white text-xs font-bold px-2 py-1 rounded-t mt-1">
                🥉
              </div>
              <div className="bg-amber-700/20 w-14 h-12 rounded-t flex flex-col items-center justify-center">
                <span className="text-xs font-medium truncate max-w-12">{top3[2].full_name?.split(' ')[0]}</span>
                <span className="text-xs text-muted-foreground">{top3[2].xp_earned} XP</span>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* User Status / Join Button */}
      {userParticipation ? (
        <div className="bg-card/50 backdrop-blur rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="font-bold text-primary">#{userRank}</span>
              </div>
              <div>
                <p className="font-medium">Sizning o'rningiz</p>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    {userParticipation.xp_earned} XP
                  </span>
                  <span className="flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-green-500" />
                    {userParticipation.words_reviewed} so'z
                  </span>
                </div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
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
