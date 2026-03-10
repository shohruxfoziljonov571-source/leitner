import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Users, Activity, BarChart3, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface RetentionData {
  day: number;
  retained: number;
  percentage: number;
}

interface CohortData {
  week: string;
  users: number;
  d1: number;
  d7: number;
  d14: number;
  d30: number;
}

const AdvancedStatistics = () => {
  const [loading, setLoading] = useState(true);
  const [retentionData, setRetentionData] = useState<RetentionData[]>([]);
  const [cohortData, setCohortData] = useState<CohortData[]>([]);
  const [metrics, setMetrics] = useState({
    dau: 0,
    wau: 0,
    mau: 0,
    dauMauRatio: 0,
    avgSessionWords: 0,
    churnRate: 0,
    retentionRate: 0
  });

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // DAU, WAU, MAU — count distinct user_ids via single queries
      const [dauResult, wauResult, mauResult] = await Promise.all([
        supabase.from('user_stats').select('user_id', { count: 'exact', head: true }).eq('last_active_date', todayStr),
        supabase.from('user_stats').select('user_id', { count: 'exact', head: true }).gte('last_active_date', weekAgo),
        supabase.from('user_stats').select('user_id', { count: 'exact', head: true }).gte('last_active_date', monthAgo)
      ]);

      const dau = dauResult.count || 0;
      const wau = wauResult.count || 0;
      const mau = mauResult.count || 0;

      // Average words per session today
      const { data: todayStats } = await supabase
        .from('daily_stats')
        .select('words_reviewed')
        .eq('date', todayStr);

      const avgSessionWords = todayStats?.length 
        ? Math.round(todayStats.reduce((sum, s) => sum + (s.words_reviewed || 0), 0) / todayStats.length)
        : 0;

      // Weekly retention: users active last week who returned this week
      const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const [{ data: thisWeekUsers }, { data: lastWeekUsers }] = await Promise.all([
        supabase.from('user_stats').select('user_id').gte('last_active_date', weekAgo),
        supabase.from('user_stats').select('user_id').gte('last_active_date', twoWeeksAgo).lt('last_active_date', weekAgo)
      ]);

      const thisWeekSet = new Set(thisWeekUsers?.map(u => u.user_id) || []);
      const retained = lastWeekUsers?.filter(u => thisWeekSet.has(u.user_id)).length || 0;
      const retentionRate = lastWeekUsers?.length ? Math.round((retained / lastWeekUsers.length) * 100) : 0;
      const churnRate = 100 - retentionRate;

      setMetrics({
        dau, wau, mau,
        dauMauRatio: mau ? Math.round((dau / mau) * 100) : 0,
        avgSessionWords,
        churnRate,
        retentionRate
      });

      // Retention curve: for each day D1..D14, what % of users who signed up
      // that many days ago came back on or after that day
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('user_id, created_at')
        .gte('created_at', monthAgo);

      const { data: allUserStats } = await supabase
        .from('user_stats')
        .select('user_id, last_active_date')
        .gte('last_active_date', monthAgo);

      const lastActiveMap = new Map<string, string>();
      allUserStats?.forEach(s => {
        const existing = lastActiveMap.get(s.user_id);
        if (!existing || s.last_active_date > existing) {
          lastActiveMap.set(s.user_id, s.last_active_date);
        }
      });

      // Retention curve: of users who signed up 14+ days ago, how many were active on day N
      const retentionCurve: RetentionData[] = [];
      const oldEnoughUsers = allProfiles?.filter(p => {
        const signupDate = new Date(p.created_at);
        const daysSinceSignup = Math.floor((today.getTime() - signupDate.getTime()) / (24 * 60 * 60 * 1000));
        return daysSinceSignup >= 14;
      }) || [];

      const totalBase = oldEnoughUsers.length || 1;

      for (let d = 1; d <= 14; d++) {
        let retainedCount = 0;
        oldEnoughUsers.forEach(p => {
          const signupDate = new Date(p.created_at).toISOString().split('T')[0];
          const targetDate = new Date(new Date(p.created_at).getTime() + d * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          const lastActive = lastActiveMap.get(p.user_id);
          if (lastActive && lastActive >= targetDate) {
            retainedCount++;
          }
        });

        retentionCurve.push({
          day: d,
          retained: retainedCount,
          percentage: Math.round((retainedCount / totalBase) * 100)
        });
      }
      setRetentionData(retentionCurve);

      // Cohort analysis: last 4 weeks with real D1, D7, D14, D30
      const cohorts: CohortData[] = [];
      for (let w = 0; w < 4; w++) {
        const weekStart = new Date(today.getTime() - (w + 1) * 7 * 24 * 60 * 60 * 1000);
        const weekEnd = new Date(today.getTime() - w * 7 * 24 * 60 * 60 * 1000);

        const cohortUsers = allProfiles?.filter(p => {
          const d = new Date(p.created_at);
          return d >= weekStart && d < weekEnd;
        }) || [];

        const weekUsers = cohortUsers.length;
        if (weekUsers === 0) {
          cohorts.push({
            week: `${weekStart.getDate()}/${weekStart.getMonth() + 1}`,
            users: 0, d1: 0, d7: 0, d14: 0, d30: 0
          });
          continue;
        }

        const calcRetention = (days: number): number => {
          const daysFromWeekStart = Math.floor((today.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000));
          if (daysFromWeekStart < days) return -1; // Not enough time has passed

          let count = 0;
          cohortUsers.forEach(u => {
            const signupDate = new Date(u.created_at);
            const targetDate = new Date(signupDate.getTime() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const lastActive = lastActiveMap.get(u.user_id);
            if (lastActive && lastActive >= targetDate) {
              count++;
            }
          });
          return Math.round((count / weekUsers) * 100);
        };

        cohorts.push({
          week: `${weekStart.getDate()}/${weekStart.getMonth() + 1}`,
          users: weekUsers,
          d1: calcRetention(1),
          d7: calcRetention(7),
          d14: calcRetention(14),
          d30: calcRetention(30)
        });
      }
      setCohortData(cohorts.reverse());

    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">DAU</p>
                <p className="text-2xl font-bold">{metrics.dau}</p>
              </div>
              <Activity className="h-8 w-8 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">WAU</p>
                <p className="text-2xl font-bold">{metrics.wau}</p>
              </div>
              <Users className="h-8 w-8 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">MAU</p>
                <p className="text-2xl font-bold">{metrics.mau}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">DAU/MAU</p>
                <p className="text-2xl font-bold">{metrics.dauMauRatio}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Retention & Churn */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full ${metrics.retentionRate >= 50 ? 'bg-primary/10' : 'bg-destructive/10'}`}>
                <TrendingUp className={`h-6 w-6 ${metrics.retentionRate >= 50 ? 'text-primary' : 'text-destructive'}`} />
              </div>
              <div>
                <p className="text-3xl font-bold">{metrics.retentionRate}%</p>
                <p className="text-sm text-muted-foreground">Haftalik retention</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full ${metrics.churnRate <= 50 ? 'bg-primary/10' : 'bg-destructive/10'}`}>
                <TrendingDown className={`h-6 w-6 ${metrics.churnRate <= 50 ? 'text-primary' : 'text-destructive'}`} />
              </div>
              <div>
                <p className="text-3xl font-bold">{metrics.churnRate}%</p>
                <p className="text-sm text-muted-foreground">Haftalik churn</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Retention Curve */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Retention egri chizig'i (D1–D14)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={retentionData}>
                <defs>
                  <linearGradient id="colorRetention" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" tickFormatter={(d) => `D${d}`} className="text-xs" />
                <YAxis className="text-xs" unit="%" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-popover p-3 rounded-lg shadow-lg border">
                          <p className="font-medium">D{payload[0]?.payload.day}</p>
                          <p className="text-sm text-muted-foreground">
                            Retention: {payload[0]?.value}% ({payload[0]?.payload.retained} foydalanuvchi)
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="percentage"
                  stroke="hsl(var(--primary))"
                  fillOpacity={1}
                  fill="url(#colorRetention)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Cohort Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cohort tahlili</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Hafta</th>
                  <th className="text-center p-2">Foydalanuvchilar</th>
                  <th className="text-center p-2">D1</th>
                  <th className="text-center p-2">D7</th>
                  <th className="text-center p-2">D14</th>
                  <th className="text-center p-2">D30</th>
                </tr>
              </thead>
              <tbody>
                {cohortData.map((cohort, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-2 font-medium">{cohort.week}</td>
                    <td className="text-center p-2">{cohort.users}</td>
                    {[cohort.d1, cohort.d7, cohort.d14, cohort.d30].map((val, j) => (
                      <td key={j} className="text-center p-2">
                        {val === -1 ? (
                          <span className="px-2 py-1 rounded text-xs bg-muted text-muted-foreground">—</span>
                        ) : (
                          <span className={`px-2 py-1 rounded text-xs ${
                            val >= 50 ? 'bg-primary/20 text-primary' : val >= 25 ? 'bg-accent' : 'bg-muted'
                          }`}>
                            {val}%
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            "—" — hali yetarli vaqt o'tmagan
          </p>
        </CardContent>
      </Card>

      {/* Session Stats */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-primary/10">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-3xl font-bold">{metrics.avgSessionWords}</p>
              <p className="text-sm text-muted-foreground">O'rtacha so'z/sessiya (bugun)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvancedStatistics;
