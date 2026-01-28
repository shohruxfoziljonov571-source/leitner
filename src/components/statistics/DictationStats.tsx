import React from 'react';
import { motion } from 'framer-motion';
import { Mic, Target, Zap, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useDictationStats } from '@/hooks/useDictationStats';
import { formatDistanceToNow } from 'date-fns';
import { uz } from 'date-fns/locale';

const DictationStats: React.FC = () => {
  const { stats, isLoading } = useDictationStats();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="animate-pulse flex items-center justify-center">
            Yuklanmoqda...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (stats.totalDictations === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-primary" />
            Diktant statistikasi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            Hali diktant yozilmagan. Birinchi diktantingizni yozing!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-primary" />
            Diktant statistikasi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-xl">
              <div className="flex items-center justify-center mb-2">
                <Mic className="h-5 w-5 text-primary" />
              </div>
              <p className="font-display font-bold text-2xl text-primary">
                {stats.totalDictations}
              </p>
              <p className="text-xs text-muted-foreground">diktant</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-xl">
              <div className="flex items-center justify-center mb-2">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <p className="font-display font-bold text-2xl text-primary">
                {stats.averageAccuracy}%
              </p>
              <p className="text-xs text-muted-foreground">o'rtacha</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-xl">
              <div className="flex items-center justify-center mb-2">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <p className="font-display font-bold text-2xl text-primary">
                {stats.totalXpEarned}
              </p>
              <p className="text-xs text-muted-foreground">XP</p>
            </div>
          </div>

          {/* Recent Dictations */}
          {stats.recentSubmissions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Oxirgi diktantlar
              </h4>
              <div className="space-y-3">
                {stats.recentSubmissions.map((submission, index) => (
                  <motion.div
                    key={submission.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-3 bg-muted/30 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium truncate flex-1 mr-2">
                        {submission.dictation_title}
                      </p>
                      <span 
                        className={`text-sm font-semibold shrink-0 ${
                          (submission.accuracy_percentage ?? 0) >= 80 
                            ? 'text-green-500' 
                            : (submission.accuracy_percentage ?? 0) >= 60 
                              ? 'text-yellow-500' 
                              : 'text-red-500'
                        }`}
                      >
                        {submission.accuracy_percentage ?? 0}%
                      </span>
                    </div>
                    <Progress 
                      value={submission.accuracy_percentage ?? 0} 
                      className="h-2 w-full"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(submission.created_at), {
                        addSuffix: true,
                        locale: uz,
                      })}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default DictationStats;
