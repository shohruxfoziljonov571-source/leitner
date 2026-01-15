import React from 'react';
import { motion } from 'framer-motion';
import { Clock, BookOpen, Trophy, Flame, Zap } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { uz } from 'date-fns/locale';

interface FriendActivityItem {
  id: string;
  friendName: string;
  avatarUrl: string | null;
  activityType: 'review' | 'streak' | 'level_up' | 'words_added';
  activityData: {
    wordsReviewed?: number;
    streak?: number;
    level?: number;
    wordsAdded?: number;
  };
  timestamp: Date;
}

interface FriendActivityProps {
  activities: FriendActivityItem[];
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'review':
      return <BookOpen className="w-4 h-4 text-primary" />;
    case 'streak':
      return <Flame className="w-4 h-4 text-orange-500" />;
    case 'level_up':
      return <Trophy className="w-4 h-4 text-yellow-500" />;
    case 'words_added':
      return <Zap className="w-4 h-4 text-blue-500" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
};

const getActivityText = (activity: FriendActivityItem) => {
  switch (activity.activityType) {
    case 'review':
      return `${activity.activityData.wordsReviewed} so'z takrorladi`;
    case 'streak':
      return `${activity.activityData.streak} kunlik streak!`;
    case 'level_up':
      return `${activity.activityData.level}-darajaga ko'tarildi!`;
    case 'words_added':
      return `${activity.activityData.wordsAdded} ta yangi so'z qo'shdi`;
    default:
      return 'Faol bo\'ldi';
  }
};

const FriendActivity: React.FC<FriendActivityProps> = ({ activities }) => {
  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>Hali faollik yo'q</p>
        <p className="text-sm mt-1">Do'stlaringiz o'rganishni boshlaganda bu yerda ko'rinadi</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity, index) => (
        <motion.div
          key={activity.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted/70 transition-colors"
        >
          <Avatar className="h-10 w-10">
            <AvatarImage src={activity.avatarUrl || undefined} />
            <AvatarFallback>
              {activity.friendName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {getActivityIcon(activity.activityType)}
              <p className="font-medium text-sm truncate">{activity.friendName}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              {getActivityText(activity)}
            </p>
          </div>
          
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDistanceToNow(activity.timestamp, { 
              addSuffix: true,
              locale: uz
            })}
          </span>
        </motion.div>
      ))}
    </div>
  );
};

export default FriendActivity;
