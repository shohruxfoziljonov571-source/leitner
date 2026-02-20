import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, LineChart, Line, Legend,
} from 'recharts';
import { TrendingUp, Zap, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLearningLanguage } from '@/contexts/LearningLanguageContext';

interface DailyData {
  date: string;       // short weekday label
  fullDate: string;   // "12 May" for tooltip
  words_reviewed: number;
  words_correct: number;
  xp_earned: number;
  cumulative_words: number;
  cumulative_xp: number;
}

const getLocalDateStr = (d: Date): string => {
  // Use local date, not UTC — matches daily_stats.date column
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const WEEKDAYS = ['Yak', 'Du', 'Se', 'Cho', 'Pay', 'Ju', 'Sha'];

const WeeklyChart: React.FC = () => {
  const [data, setData] = useState<DailyData[]>([]);
  const [activeTab, setActiveTab] = useState<'activity' | 'growth' | 'xp'>('activity');
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { activeLanguage } = useLearningLanguage();

  useEffect(() => {
    const fetchWeeklyData = async () => {
      if (!user || !activeLanguage) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // Build last-7-days range using LOCAL dates (avoids UTC shift bugs)
        const today = new Date();
        const dates: Date[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          dates.push(d);
        }

        const fromStr = getLocalDateStr(dates[0]);
        const toStr = getLocalDateStr(dates[6]);

        const { data: stats, error } = await supabase
          .from('daily_stats')
          .select('date, words_reviewed, words_correct, xp_earned')
          .eq('user_id', user.id)
          .eq('user_language_id', activeLanguage.id)
          .gte('date', fromStr)
          .lte('date', toStr)
          .order('date', { ascending: true });

        if (error) throw error;

        // Index DB rows by date string for O(1) lookup
        const statsMap = new Map<string, typeof stats[0]>();
        (stats || []).forEach(s => statsMap.set(s.date, s));

        // Fill 7 days, accumulate cumulative totals
        const filledData: DailyData[] = [];
        let cumulativeWords = 0;
        let cumulativeXp = 0;

        for (const date of dates) {
          const dateStr = getLocalDateStr(date);
          const row = statsMap.get(dateStr);
          const reviewed = row?.words_reviewed ?? 0;
          const correct = row?.words_correct ?? 0;
          const xpEarned = row?.xp_earned ?? 0;

          cumulativeWords += reviewed;
          cumulativeXp += xpEarned;

          filledData.push({
            date: WEEKDAYS[date.getDay()],
            fullDate: date.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' }),
            words_reviewed: reviewed,
            words_correct: correct,
            xp_earned: xpEarned,
            cumulative_words: cumulativeWords,
            cumulative_xp: cumulativeXp,
          });
        }

        setData(filledData);
      } catch (err) {
        console.error('Error fetching weekly data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWeeklyData();
  }, [user, activeLanguage]);

  // Summary stats computed from data
  const { totalReviewed, totalXp, avgDaily, accuracy } = useMemo(() => {
    const totalReviewed = data.reduce((s, d) => s + d.words_reviewed, 0);
    const totalCorrect = data.reduce((s, d) => s + d.words_correct, 0);
    const totalXp = data.reduce((s, d) => s + d.xp_earned, 0);
    // Average only over active days (days with at least 1 review)
    const activeDays = data.filter(d => d.words_reviewed > 0).length;
    const avgDaily = activeDays > 0 ? Math.round(totalReviewed / activeDays) : 0;
    const accuracy = totalReviewed > 0 ? Math.round((totalCorrect / totalReviewed) * 100) : 0;
    return { totalReviewed, totalXp, avgDaily, accuracy };
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    // Find full date by matching short label
    const item = data.find(d => d.date === label);
    return (
      <div className="bg-card p-3 rounded-xl shadow-elevated border border-border text-sm">
        <p className="font-semibold text-foreground mb-1.5">{item?.fullDate ?? label}</p>
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium text-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  const tabs = [
    { id: 'activity' as const, label: 'Faollik', icon: Activity },
    { id: 'growth' as const, label: "O'sish", icon: TrendingUp },
    { id: 'xp' as const, label: 'XP', icon: Zap },
  ];

  const hasData = data.some(d => d.words_reviewed > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-3xl shadow-card p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-lg text-foreground">
          Haftalik statistika
        </h3>
        <div className="flex gap-1 bg-muted rounded-xl p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="w-3 h-3" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        <div className="text-center p-2 bg-muted/50 rounded-xl">
          <p className="font-bold text-base text-primary">{totalReviewed}</p>
          <p className="text-[10px] text-muted-foreground leading-tight">Jami takror</p>
        </div>
        <div className="text-center p-2 bg-muted/50 rounded-xl">
          <p className="font-bold text-base text-primary">{avgDaily}</p>
          <p className="text-[10px] text-muted-foreground leading-tight text-left pl-1">O'rtacha/kun</p>
        </div>
        <div className="text-center p-2 bg-muted/50 rounded-xl">
          <p className="font-bold text-base text-primary">{accuracy}%</p>
          <p className="text-[10px] text-muted-foreground leading-tight">Aniqlik</p>
        </div>
        <div className="text-center p-2 bg-muted/50 rounded-xl">
          <p className="font-bold text-base text-primary">{totalXp}</p>
          <p className="text-[10px] text-muted-foreground leading-tight">Jami XP</p>
        </div>
      </div>

      {/* Chart area */}
      <div className="h-[180px]">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-pulse-soft text-muted-foreground text-sm">Yuklanmoqda...</div>
          </div>
        ) : !hasData ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-center">
            <div className="text-3xl">📊</div>
            <p className="text-sm text-muted-foreground">
              Bu hafta hali so'z takrorlanmagan
            </p>
          </div>
        ) : (
          <>
            {activeTab === 'activity' && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={28}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.5)' }} />
                  <Legend
                    wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
                    iconType="circle"
                    iconSize={8}
                  />
                  <Bar
                    dataKey="words_reviewed"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                    name="Takrorlar"
                    maxBarSize={32}
                  />
                  <Bar
                    dataKey="words_correct"
                    fill="hsl(var(--primary) / 0.35)"
                    radius={[4, 4, 0, 0]}
                    name="To'g'ri"
                    maxBarSize={32}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}

            {activeTab === 'growth' && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={28}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="cumulative_words"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    fill="url(#growthGrad)"
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
                    activeDot={{ r: 5, fill: 'hsl(var(--primary))' }}
                    name="Jami takrorlar"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}

            {activeTab === 'xp' && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <defs>
                    <linearGradient id="xpGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={28}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
                    iconType="circle"
                    iconSize={8}
                  />
                  <Line
                    type="monotone"
                    dataKey="xp_earned"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3.5 }}
                    activeDot={{ r: 5.5, fill: 'hsl(var(--primary))' }}
                    name="Kunlik XP"
                  />
                  <Line
                    type="monotone"
                    dataKey="cumulative_xp"
                    stroke="hsl(var(--chart-2, var(--primary) / 0.5))"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    activeDot={false}
                    name="Jami XP"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};

export default WeeklyChart;
