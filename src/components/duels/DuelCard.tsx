import React from 'react';
import { motion } from 'framer-motion';
import { Swords, Clock, Check, X, Trophy, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { uz } from 'date-fns/locale';

interface DuelCardProps {
  duel: {
    id: string;
    challenger_id: string;
    opponent_id: string;
    status: 'pending' | 'active' | 'completed' | 'declined' | 'expired';
    word_count: number;
    challenger_score: number;
    opponent_score: number;
    challenger_time_ms: number;
    opponent_time_ms: number;
    winner_id: string | null;
    expires_at: string;
    created_at: string;
    challenger_name?: string;
    opponent_name?: string;
    challenger_avatar?: string;
    opponent_avatar?: string;
  };
  onAccept?: () => void;
  onDecline?: () => void;
  onPlay?: () => void;
}

const DuelCard: React.FC<DuelCardProps> = ({
  duel,
  onAccept,
  onDecline,
  onPlay,
}) => {
  const { user } = useAuth();
  const isChallenger = duel.challenger_id === user?.id;
  const isOpponent = duel.opponent_id === user?.id;
  const isPending = duel.status === 'pending';
  const isActive = duel.status === 'active';
  const isCompleted = duel.status === 'completed';

  const isWinner = duel.winner_id === user?.id;
  const isDraw = isCompleted && !duel.winner_id;

  const formatTime = (ms: number) => {
    if (ms === 0) return '-';
    const seconds = Math.floor(ms / 1000);
    return `${seconds}s`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl p-4 border ${
        isCompleted
          ? isWinner
            ? 'bg-green-500/10 border-green-500/30'
            : isDraw
            ? 'bg-yellow-500/10 border-yellow-500/30'
            : 'bg-red-500/10 border-red-500/30'
          : 'bg-card border-border'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Swords className="w-5 h-5 text-primary" />
          <span className="font-semibold">{duel.word_count} so'z</span>
        </div>
        {isPending && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            {formatDistanceToNow(new Date(duel.expires_at), { locale: uz, addSuffix: true })}
          </div>
        )}
        {isCompleted && (
          <div className="flex items-center gap-1">
            {isWinner ? (
              <Trophy className="w-5 h-5 text-yellow-500" />
            ) : isDraw ? (
              <span className="text-sm text-yellow-600">Durrang</span>
            ) : (
              <X className="w-5 h-5 text-red-500" />
            )}
          </div>
        )}
      </div>

      {/* Players */}
      <div className="flex items-center justify-between mb-4">
        {/* Challenger */}
        <div className="flex items-center gap-2">
          <Avatar className="w-10 h-10">
            <AvatarImage src={duel.challenger_avatar} />
            <AvatarFallback>{duel.challenger_name?.[0] || '?'}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">
              {isChallenger ? 'Siz' : duel.challenger_name}
            </p>
            {(isActive || isCompleted) && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{duel.challenger_score}/{duel.word_count}</span>
                <Timer className="w-3 h-3" />
                <span>{formatTime(duel.challenger_time_ms)}</span>
              </div>
            )}
          </div>
        </div>

        <span className="text-lg font-bold text-muted-foreground">VS</span>

        {/* Opponent */}
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="font-medium text-sm">
              {isOpponent ? 'Siz' : duel.opponent_name}
            </p>
            {(isActive || isCompleted) && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{duel.opponent_score}/{duel.word_count}</span>
                <Timer className="w-3 h-3" />
                <span>{formatTime(duel.opponent_time_ms)}</span>
              </div>
            )}
          </div>
          <Avatar className="w-10 h-10">
            <AvatarImage src={duel.opponent_avatar} />
            <AvatarFallback>{duel.opponent_name?.[0] || '?'}</AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Actions */}
      {isPending && isOpponent && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onDecline}
            className="flex-1 gap-1"
          >
            <X className="w-4 h-4" />
            Rad etish
          </Button>
          <Button
            size="sm"
            onClick={onAccept}
            className="flex-1 gap-1"
          >
            <Check className="w-4 h-4" />
            Qabul qilish
          </Button>
        </div>
      )}

      {isPending && isChallenger && (
        <p className="text-sm text-center text-muted-foreground">
          Raqib javobini kutilmoqda...
        </p>
      )}

      {isActive && (
        <Button
          size="sm"
          onClick={onPlay}
          className="w-full gap-2"
        >
          <Swords className="w-4 h-4" />
          O'ynash
        </Button>
      )}

      {isCompleted && (
        <p className="text-sm text-center font-medium">
          {isWinner
            ? '🎉 Tabriklaymiz, siz g\'olib!'
            : isDraw
            ? '🤝 Durrang!'
            : 'Keyingi safar omad!'}
        </p>
      )}
    </motion.div>
  );
};

export default DuelCard;
