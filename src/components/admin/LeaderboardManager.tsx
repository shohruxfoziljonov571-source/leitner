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
      // Fetch XP leaderboard
      const { data: xpData } = await supabase
        .from('user_stats')
        .select('user_id, xp')
        .order('xp', { ascending: false })
        .limit(50);

      // Fetch Streak leaderboard
      const { data: streakData } = await supabase
        .from('user_stats')
        .select('user_id, streak')
        .order('streak', { ascending: false })
        .limit(50);

      // Fetch Words leaderboard
      const { data: wordsData } = await supabase
        .from('user_stats')
        .select('user_id, total_words')
        .order('total_words', { ascending: false })
        .limit(50);

      // Get unique user IDs
      const allUserIds = new Set([
        ...(xpData?.map(u => u.user_id) || []),
        ...(streakData?.map(u => u.user_id) || []),
        ...(wordsData?.map(u => u.user_id) || [])
      ]);

      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, telegram_username, avatar_url')
        .in('user_id', [...allUserIds]);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Build leaderboards
      const buildLeaderboard = (data: any[], valueKey: string): LeaderboardEntry[] => {
        return data?.map((item, index) => {
          const profile = profileMap.get(item.user_id);
          return {
            rank: index + 1,
            user_id: item.user_id,
            full_name: profile?.full_name || 'Nomsiz',
            telegram_username: profile?.telegram_username,
            value: item[valueKey] || 0,
            avatar: profile?.avatar_url
          };
        }) || [];
      };

      setXpLeaderboard(buildLeaderboard(xpData || [], 'xp'));
      setStreakLeaderboard(buildLeaderboard(streakData || [], 'streak'));
      setWordsLeaderboard(buildLeaderboard(wordsData || [], 'total_words'));

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
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="w-5 text-center text-muted-foreground">{rank}</span>;
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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Crown className="h-4 w-4 text-yellow-500" />
              Top XP
            </CardTitle>
          </CardHeader>
          <CardContent>
            {xpLeaderboard.slice(0, 3).map((entry, i) => (
              <div key={entry.user_id} className="flex items-center justify-between py-1">
                <span className="text-sm">{i + 1}. {entry.full_name}</span>
                <Badge variant="secondary">{entry.value.toLocaleString()}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Crown className="h-4 w-4 text-orange-500" />
              Top Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            {streakLeaderboard.slice(0, 3).map((entry, i) => (
              <div key={entry.user_id} className="flex items-center justify-between py-1">
                <span className="text-sm">{i + 1}. {entry.full_name}</span>
                <Badge variant="secondary">{entry.value} kun</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Crown className="h-4 w-4 text-primary" />
              Top So'zlar
            </CardTitle>
          </CardHeader>
          <CardContent>
            {wordsLeaderboard.slice(0, 3).map((entry, i) => (
              <div key={entry.user_id} className="flex items-center justify-between py-1">
                <span className="text-sm">{i + 1}. {entry.full_name}</span>
                <Badge variant="secondary">{entry.value.toLocaleString()}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LeaderboardManager;
