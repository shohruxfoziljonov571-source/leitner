import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLearningLanguage } from '@/contexts/LearningLanguageContext';
import { useQuery } from '@tanstack/react-query';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Local date formatting helpers (avoids UTC shift from toISOString)
const formatDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateString = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

interface DayData {
  date: string;
  count: number;
}

const StreakHeatmap: React.FC = () => {
  const { user } = useAuth();
  const { activeLanguage } = useLearningLanguage();
  const [yearOffset, setYearOffset] = useState(0);
  
  const displayYear = useMemo(() => {
    return new Date().getFullYear() - yearOffset;
  }, [yearOffset]);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const { data: dailyStats = [] } = useQuery({
    queryKey: ['daily-stats', user?.id, activeLanguage?.id, displayYear],
    queryFn: async () => {
      if (!user || !activeLanguage) return [];
      
      const startDate = `${displayYear}-01-01`;
      const endDate = `${displayYear}-12-31`;
      
      const { data, error } = await supabase
        .from('daily_stats')
        .select('date, words_reviewed')
        .eq('user_id', user.id)
        .eq('user_language_id', activeLanguage.id)
        .gte('date', startDate)
        .lte('date', endDate);
      
      if (error) {
        console.error('Error fetching daily stats:', error);
        return [];
      }
      
      return (data || []).map(d => ({
        date: d.date,
        count: d.words_reviewed || 0
      }));
    },
    enabled: !!user && !!activeLanguage,
  });

  // Generate calendar data for the year
  const calendarData = useMemo(() => {
    const startDate = new Date(displayYear, 0, 1);
    const endDate = new Date(displayYear, 11, 31);
    
    // Create map for quick lookup
    const statsMap = new Map<string, number>();
    dailyStats.forEach(stat => {
      statsMap.set(stat.date, stat.count);
    });
    
    const weeks: { days: { date: Date; dateStr: string; count: number; isToday: boolean; isFuture: boolean }[] }[] = [];
    let currentWeek: { date: Date; dateStr: string; count: number; isToday: boolean; isFuture: boolean }[] = [];
    
    const today = new Date();
    const todayStr = formatDateString(today);
    
    // Add empty days at the start to align with week
    const startDayOfWeek = startDate.getDay();
    for (let i = 0; i < startDayOfWeek; i++) {
      currentWeek.push({ 
        date: new Date(0), 
        dateStr: '',
        count: -1, 
        isToday: false,
        isFuture: false,
      });
    }
    
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateStr = formatDateString(current);
      const count = statsMap.get(dateStr) || 0;
      const isFuture = dateStr > todayStr;
      
      currentWeek.push({
        date: new Date(current),
        dateStr,
        count: isFuture ? -1 : count,
        isToday: dateStr === todayStr,
        isFuture,
      });
      
      if (currentWeek.length === 7) {
        weeks.push({ days: currentWeek });
        currentWeek = [];
      }
      
      current.setDate(current.getDate() + 1);
    }
    
    // Add remaining days
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({ date: new Date(0), dateStr: '', count: -1, isToday: false, isFuture: false });
      }
      weeks.push({ days: currentWeek });
    }
    
    return weeks;
  }, [displayYear, dailyStats]);

  // Get intensity color based on count
  const getIntensityColor = (count: number, isToday: boolean, isFuture: boolean) => {
    if (count < 0 || isFuture) return 'bg-transparent';
    if (isToday && count === 0) return 'bg-muted ring-1 ring-primary/40';
    if (count === 0) return 'bg-muted';
    if (count < 5) return 'bg-primary/30';
    if (count < 10) return 'bg-primary/50';
    if (count < 20) return 'bg-primary/70';
    return 'bg-primary';
  };

  const months = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
  const days = ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'];

  const totalReviewed = useMemo(() => {
    return dailyStats.reduce((sum, d) => sum + d.count, 0);
  }, [dailyStats]);

  const activeDays = useMemo(() => {
    return dailyStats.filter(d => d.count > 0).length;
  }, [dailyStats]);

  const isCurrentYear = displayYear === currentYear;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-3xl shadow-card p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-lg">
          O'qish kalendari 📅
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setYearOffset(prev => prev + 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[60px] text-center">
            {displayYear}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setYearOffset(prev => Math.max(0, prev - 1))}
            disabled={isCurrentYear}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="flex gap-4 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Jami:</span>
          <span className="font-semibold text-primary">{totalReviewed}</span>
          <span className="text-muted-foreground">so'z</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Faol kunlar:</span>
          <span className="font-semibold text-primary">{activeDays}</span>
        </div>
      </div>

      {/* Month labels */}
      <div className="flex gap-[2px] mb-1 ml-6 text-[10px] text-muted-foreground">
        {months.map((month) => (
          <span key={month} className="flex-1 text-center">
            {month}
          </span>
        ))}
      </div>

      {/* Heatmap grid */}
      <div className="flex gap-1">
        {/* Day labels */}
        <div className="flex flex-col gap-[2px] text-[10px] text-muted-foreground pr-1">
          {days.map((day, i) => (
            <span key={day} className="h-3 leading-3">{i % 2 === 1 ? day : ''}</span>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="flex-1 overflow-x-auto">
          <TooltipProvider>
            <div className="flex gap-[2px]">
              {calendarData.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-[2px]">
                  {week.days.map((day, dayIndex) => (
                    <Tooltip key={dayIndex}>
                      <TooltipTrigger asChild>
                        <div
                          className={`w-3 h-3 rounded-sm ${getIntensityColor(day.count, day.isToday, day.isFuture)} ${
                            day.count >= 0 && !day.isFuture ? 'cursor-pointer hover:ring-1 hover:ring-primary/50' : ''
                          }`}
                        />
                      </TooltipTrigger>
                      {day.count >= 0 && !day.isFuture && (
                        <TooltipContent side="top" className="text-xs">
                          <p className="font-medium">
                            {day.date.toLocaleDateString('uz-UZ', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                          <p className="text-muted-foreground">
                            {day.count > 0 ? `${day.count} so'z o'rganildi` : "O'qilmadi"}
                          </p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  ))}
                </div>
              ))}
            </div>
          </TooltipProvider>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-2 mt-4 text-xs text-muted-foreground">
        <span>Kam</span>
        <div className="flex gap-[2px]">
          <div className="w-3 h-3 rounded-sm bg-muted" />
          <div className="w-3 h-3 rounded-sm bg-primary/30" />
          <div className="w-3 h-3 rounded-sm bg-primary/50" />
          <div className="w-3 h-3 rounded-sm bg-primary/70" />
          <div className="w-3 h-3 rounded-sm bg-primary" />
        </div>
        <span>Ko'p</span>
      </div>
    </motion.div>
  );
};

export default React.memo(StreakHeatmap);
