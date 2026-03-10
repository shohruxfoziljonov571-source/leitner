import React, { useState, useEffect } from 'react';
import { Crown, Medal, Award, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  full_name: string;
  telegram_username: string | null;
  value: number;
  avatar?: string;
}

const LeaderboardManager = () => {
  const [loading, setLoading] = useState(true);
  const [xpLeaderboard, setXpLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [streakLeaderboard, setStreakLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [wordsLeaderboard, setWordsLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeaderboards = async () => {
    setRefreshing(true);
    try {
      // Fetch all user_stats (per-language rows) and aggregate in JS
      const { data: allStats } = await supabase
        .from('user_stats')
        .select('user_id, xp, streak, total_words')
        .order('xp', { ascending: false })
        .limit(500);

      // Aggregate per user_id (since user_stats has per-language rows)
      const userAgg = new Map<string, { xp: number; streak: number; total_words: number }>();
      allStats?.forEach(s => {
        const existing = userAgg.get(s.user_id);
        if (existing) {
          existing.xp += s.xp || 0;
          existing.streak = Math.max(existing.streak, s.streak || 0);
          existing.total_words += s.total_words || 0;
        } else {
          userAgg.set(s.user_id, {
            xp: s.xp || 0,
            streak: s.streak || 0,
            total_words: s.total_words || 0
          });
        }
      });

      // Get unique user IDs
      const allUserIds = [...userAgg.keys()];

      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, telegram_username, avatar_url')
        .in('user_id', allUserIds.slice(0, 100));

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Build sorted leaderboards
      const entries = allUserIds.map(uid => ({
        user_id: uid,
        ...userAgg.get(uid)!,
        profile: profileMap.get(uid)
      }));

      const buildBoard = (
        sorted: typeof entries,
        valueKey: 'xp' | 'streak' | 'total_words',
        valueLabel: string
      ): LeaderboardEntry[] => {
        return sorted
          .sort((a, b) => b[valueKey] - a[valueKey])
          .slice(0, 50)
          .map((item, index) => ({
            rank: index + 1,
            user_id: item.user_id,
            full_name: item.profile?.full_name || 'Nomsiz',
            telegram_username: item.profile?.telegram_username || null,
            value: item[valueKey],
            avatar: item.profile?.avatar_url || undefined
          }));
      };

      setXpLeaderboard(buildBoard([...entries], 'xp', 'XP'));
      setStreakLeaderboard(buildBoard([...entries], 'streak', 'kun'));
      setWordsLeaderboard(buildBoard([...entries], 'total_words', "so'z"));

    } catch (error) {
      console.error('Error fetching leaderboards:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeaderboards();
  }, []);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2: return <Medal className="h-5 w-5 text-gray-400" />;
      case 3: return <Award className="h-5 w-5 text-amber-600" />;
      default: return <span className="w-5 text-center text-muted-foreground">{rank}</span>;
    }
  };

  const LeaderboardList = ({ data, valueLabel }: { data: LeaderboardEntry[], valueLabel: string }) => (
    <ScrollArea className="h-[500px]">
      <div className="space-y-2">
        {data.map((entry) => (
          <div
            key={entry.user_id}
            className={`flex items-center justify-between p-3 rounded-lg border ${
              entry.rank <= 3 ? 'bg-primary/5 border-primary/20' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 flex justify-center">
                {getRankIcon(entry.rank)}
              </div>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                {entry.avatar ? (
                  <img src={entry.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <span className="text-lg">{entry.full_name?.[0]?.toUpperCase() || '?'}</span>
                )}
              </div>
              <div>
                <p className="font-medium">{entry.full_name}</p>
                {entry.telegram_username && (
                  <p className="text-xs text-muted-foreground">@{entry.telegram_username}</p>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg">{entry.value.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{valueLabel}</p>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Leaderboard
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchLeaderboards}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Yangilash
          </Button>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="xp">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="xp">XP</TabsTrigger>
              <TabsTrigger value="streak">Streak</TabsTrigger>
              <TabsTrigger value="words">So'zlar</TabsTrigger>
            </TabsList>
            <TabsContent value="xp" className="mt-4">
              <LeaderboardList data={xpLeaderboard} valueLabel="XP" />
            </TabsContent>
            <TabsContent value="streak" className="mt-4">
              <LeaderboardList data={streakLeaderboard} valueLabel="kun" />
            </TabsContent>
            <TabsContent value="words" className="mt-4">
              <LeaderboardList data={wordsLeaderboard} valueLabel="so'z" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Top 3 Summary */}
      <div className="grid md:grid-cols-3 gap-4">
        {[
          { title: 'Top XP', data: xpLeaderboard, color: 'text-yellow-500', suffix: '' },
          { title: 'Top Streak', data: streakLeaderboard, color: 'text-orange-500', suffix: ' kun' },
          { title: "Top So'zlar", data: wordsLeaderboard, color: 'text-primary', suffix: '' },
        ].map(({ title, data, color, suffix }) => (
          <Card key={title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Crown className={`h-4 w-4 ${color}`} />
                {title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.slice(0, 3).map((entry, i) => (
                <div key={entry.user_id} className="flex items-center justify-between py-1">
                  <span className="text-sm">{i + 1}. {entry.full_name}</span>
                  <Badge variant="secondary">{entry.value.toLocaleString()}{suffix}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default LeaderboardManager;
