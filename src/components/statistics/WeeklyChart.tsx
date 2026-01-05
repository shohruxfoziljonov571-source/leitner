import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLearningLanguage } from '@/contexts/LearningLanguageContext';

interface DailyData {
  date: string;
  words_reviewed: number;
  words_correct: number;
  xp_earned: number;
}

const WeeklyChart: React.FC = () => {
  const [data, setData] = useState<DailyData[]>([]);
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

        // Fill in missing days
        const filledData: DailyData[] = [];
        for (let i = 0; i < 7; i++) {
          const date = new Date(weekAgo);
          date.setDate(date.getDate() + i);
          const dateStr = date.toISOString().split('T')[0];
          
          const existingData = stats?.find(s => s.date === dateStr);
          filledData.push({
            date: date.toLocaleDateString('uz-UZ', { weekday: 'short' }),
            words_reviewed: existingData?.words_reviewed || 0,
            words_correct: existingData?.words_correct || 0,
            xp_earned: existingData?.xp_earned || 0,
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
          <p className="font-semibold text-foreground">{label}</p>
          <p className="text-sm text-primary">{payload[0].value} ta takror</p>
          {payload[1] && <p className="text-sm text-green-500">{payload[1].value} ta to'g'ri</p>}
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-3xl shadow-card p-6"
    >
      <h3 className="font-display font-semibold text-lg mb-4">
        Haftalik faollik
      </h3>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="date" 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
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
              fill="hsl(var(--primary) / 0.5)" 
              radius={[4, 4, 0, 0]}
              name="To'g'ri"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

export default WeeklyChart;
