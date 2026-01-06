import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Area, AreaChart
} from 'recharts';
import { TrendingUp, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLearningLanguage } from '@/contexts/LearningLanguageContext';

interface DailyData {
  date: string;
  fullDate: string;
  words_reviewed: number;
  words_correct: number;
  xp_earned: number;
  cumulative_words: number;
  cumulative_xp: number;
}

const WeeklyChart: React.FC = () => {
  const [data, setData] = useState<DailyData[]>([]);
  const [activeTab, setActiveTab] = useState<'activity' | 'growth' | 'xp'>('activity');
  const { user } = useAuth();
  const { activeLanguage } = useLearningLanguage();

  useEffect(() => {
    const fetchWeeklyData = async () => {
      if (!user || !activeLanguage) return;

      const today = new Date();
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 6);

      try {
        const { data: stats, error } = await supabase
          .from('daily_stats')
          .select('*')
          .eq('user_id', user.id)
          .eq('user_language_id', activeLanguage.id)
          .gte('date', weekAgo.toISOString().split('T')[0])
          .order('date', { ascending: true });

        if (error) throw error;

        // Fill in missing days with cumulative totals
        const filledData: DailyData[] = [];
        let cumulativeWords = 0;
        let cumulativeXp = 0;

        for (let i = 0; i < 7; i++) {
          const date = new Date(weekAgo);
          date.setDate(date.getDate() + i);
          const dateStr = date.toISOString().split('T')[0];
          
          const existingData = stats?.find(s => s.date === dateStr);
          const reviewed = existingData?.words_reviewed || 0;
          const xpEarned = existingData?.xp_earned || 0;
          
          cumulativeWords += reviewed;
          cumulativeXp += xpEarned;

          filledData.push({
            date: date.toLocaleDateString('uz-UZ', { weekday: 'short' }),
            fullDate: date.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' }),
            words_reviewed: reviewed,
            words_correct: existingData?.words_correct || 0,
            xp_earned: xpEarned,
            cumulative_words: cumulativeWords,
            cumulative_xp: cumulativeXp,
          });
        }

        setData(filledData);
      } catch (error) {
        console.error('Error fetching weekly data:', error);
      }
    };

    fetchWeeklyData();
  }, [user, activeLanguage]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card p-3 rounded-xl shadow-elevated border border-border">
          <p className="font-semibold text-foreground mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const totalReviewed = data.reduce((sum, d) => sum + d.words_reviewed, 0);
  const totalXp = data.reduce((sum, d) => sum + d.xp_earned, 0);
  const avgDaily = data.length > 0 ? Math.round(totalReviewed / data.length) : 0;

  const tabs = [
    { id: 'activity', label: 'Faollik', icon: null },
    { id: 'growth', label: "O'sish", icon: TrendingUp },
    { id: 'xp', label: 'XP', icon: Zap },
  ] as const;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-3xl shadow-card p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-lg">
          Haftalik statistika
        </h3>
        <div className="flex gap-1 bg-muted rounded-xl p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.icon && <tab.icon className="w-3 h-3" />}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center p-2 bg-muted/50 rounded-xl">
          <p className="font-bold text-lg text-primary">{totalReviewed}</p>
          <p className="text-xs text-muted-foreground">Jami takror</p>
        </div>
        <div className="text-center p-2 bg-muted/50 rounded-xl">
          <p className="font-bold text-lg text-primary">{avgDaily}</p>
          <p className="text-xs text-muted-foreground">O'rtacha/kun</p>
        </div>
        <div className="text-center p-2 bg-muted/50 rounded-xl">
          <p className="font-bold text-lg text-primary">{totalXp}</p>
          <p className="text-xs text-muted-foreground">Jami XP</p>
        </div>
      </div>

      <div className="h-[180px]">
        {activeTab === 'activity' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="words_reviewed" 
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]}
                name="Takrorlar"
              />
              <Bar 
                dataKey="words_correct" 
                fill="hsl(var(--primary) / 0.4)" 
                radius={[4, 4, 0, 0]}
                name="To'g'ri"
              />
            </BarChart>
          </ResponsiveContainer>
        )}

        {activeTab === 'growth' && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="cumulative_words"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#colorGrowth)"
                name="Jami takrorlar"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {activeTab === 'xp' && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="xp_earned"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
                name="XP"
              />
              <Line
                type="monotone"
                dataKey="cumulative_xp"
                stroke="hsl(var(--secondary))"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Jami XP"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </motion.div>
  );
};

export default WeeklyChart;
