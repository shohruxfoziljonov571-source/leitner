import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLearningLanguage } from '@/contexts/LearningLanguageContext';
import { useQuery } from '@tanstack/react-query';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';

const formatDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const StreakHeatmap: React.FC = () => {
  const { user } = useAuth();
  const { activeLanguage } = useLearningLanguage();
  const isMobile = useIsMobile();
  const [yearOffset, setYearOffset] = useState(0);
  // For mobile: show by month
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  const displayYear = useMemo(() => {
    return new Date().getFullYear() - yearOffset;
  }, [yearOffset]);

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

  const totalReviewed = useMemo(() => {
    return dailyStats.reduce((sum, d) => sum + d.count, 0);
  }, [dailyStats]);

  const activeDays = useMemo(() => {
    return dailyStats.filter(d => d.count > 0).length;
  }, [dailyStats]);

  // Monthly stats for selected month
  const monthlyStats = useMemo(() => {
    const monthStr = String(selectedMonth + 1).padStart(2, '0');
    const prefix = `${displayYear}-${monthStr}`;
    const filtered = dailyStats.filter(d => d.date.startsWith(prefix));
    return {
      total: filtered.reduce((s, d) => s + d.count, 0),
      active: filtered.filter(d => d.count > 0).length,
    };
  }, [dailyStats, selectedMonth, displayYear]);

  // Generate month calendar grid
  const monthCalendar = useMemo(() => {
    const firstDay = new Date(displayYear, selectedMonth, 1);
    const lastDay = new Date(displayYear, selectedMonth + 1, 0);
    const today = new Date();
    const todayStr = formatDateString(today);

    const statsMap = new Map<string, number>();
    dailyStats.forEach(stat => statsMap.set(stat.date, stat.count));

    const startDow = firstDay.getDay(); // 0=Sun
    const daysInMonth = lastDay.getDate();

    const cells: { day: number; dateStr: string; count: number; isToday: boolean; isFuture: boolean; isEmpty: boolean }[] = [];

    // Empty cells before month start
    for (let i = 0; i < startDow; i++) {
      cells.push({ day: 0, dateStr: '', count: -1, isToday: false, isFuture: false, isEmpty: true });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(displayYear, selectedMonth, d);
      const dateStr = formatDateString(date);
      const isFuture = dateStr > todayStr;
      const count = isFuture ? -1 : (statsMap.get(dateStr) || 0);
      cells.push({ day: d, dateStr, count, isToday: dateStr === todayStr, isFuture, isEmpty: false });
    }

    return cells;
  }, [displayYear, selectedMonth, dailyStats]);

  // Full year heatmap for desktop
  const calendarData = useMemo(() => {
    if (isMobile) return [];

    const startDate = new Date(displayYear, 0, 1);
    const endDate = new Date(displayYear, 11, 31);

    const statsMap = new Map<string, number>();
    dailyStats.forEach(stat => statsMap.set(stat.date, stat.count));

    const weeks: { days: { date: Date; dateStr: string; count: number; isToday: boolean; isFuture: boolean }[] }[] = [];
    let currentWeek: { date: Date; dateStr: string; count: number; isToday: boolean; isFuture: boolean }[] = [];

    const today = new Date();
    const todayStr = formatDateString(today);

    const startDayOfWeek = startDate.getDay();
    for (let i = 0; i < startDayOfWeek; i++) {
      currentWeek.push({ date: new Date(0), dateStr: '', count: -1, isToday: false, isFuture: false });
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

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({ date: new Date(0), dateStr: '', count: -1, isToday: false, isFuture: false });
      }
      weeks.push({ days: currentWeek });
    }

    return weeks;
  }, [displayYear, dailyStats, isMobile]);

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
  const fullMonths = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
  const dayLabels = ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'];
  const isCurrentYear = displayYear === currentYear;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-3xl shadow-card p-4 md:p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <h3 className="font-display font-semibold text-base md:text-lg">
            O'qish kalendari
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setYearOffset(prev => prev + 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[48px] text-center">{displayYear}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setYearOffset(prev => Math.max(0, prev - 1))} disabled={isCurrentYear}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="flex gap-4 mb-3 text-xs md:text-sm">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Jami:</span>
          <span className="font-semibold text-primary">{totalReviewed}</span>
          <span className="text-muted-foreground">so'z</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Faol:</span>
          <span className="font-semibold text-primary">{activeDays}</span>
          <span className="text-muted-foreground">kun</span>
        </div>
      </div>

      {isMobile ? (
        /* === MOBILE: Monthly calendar view === */
        <div>
          {/* Month selector */}
          <div className="flex items-center justify-between mb-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setSelectedMonth(prev => Math.max(0, prev - 1))}
              disabled={selectedMonth === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold">{fullMonths[selectedMonth]}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setSelectedMonth(prev => Math.min(11, prev + 1))}
              disabled={selectedMonth === 11}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Month stats */}
          <div className="flex gap-3 mb-3 text-xs">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Oy:</span>
              <span className="font-semibold text-primary">{monthlyStats.total}</span>
              <span className="text-muted-foreground">so'z</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Faol:</span>
              <span className="font-semibold text-primary">{monthlyStats.active}</span>
              <span className="text-muted-foreground">kun</span>
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {dayLabels.map(d => (
              <div key={d} className="text-center text-[10px] text-muted-foreground font-medium">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {monthCalendar.map((cell, i) => (
              <TooltipProvider key={i}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={`aspect-square rounded-md flex items-center justify-center text-[11px] font-medium transition-colors ${
                        cell.isEmpty
                          ? ''
                          : cell.isFuture
                          ? 'text-muted-foreground/30'
                          : cell.count > 0
                          ? `${getIntensityColor(cell.count, cell.isToday, cell.isFuture)} text-primary-foreground`
                          : cell.isToday
                          ? 'bg-muted ring-1 ring-primary/40 text-foreground'
                          : 'bg-muted/50 text-muted-foreground'
                      }`}
                    >
                      {cell.day > 0 ? cell.day : ''}
                    </div>
                  </TooltipTrigger>
                  {cell.day > 0 && !cell.isFuture && (
                    <TooltipContent side="top" className="text-xs">
                      <p className="font-medium">{cell.day} {fullMonths[selectedMonth]}</p>
                      <p className="text-muted-foreground">
                        {cell.count > 0 ? `${cell.count} so'z o'rganildi` : "O'qilmadi"}
                      </p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </div>
      ) : (
        /* === DESKTOP: Full year heatmap === */
        <div>
          {/* Month labels */}
          <div className="flex gap-[2px] mb-1 ml-6 text-[10px] text-muted-foreground">
            {months.map((month) => (
              <span key={month} className="flex-1 text-center">{month}</span>
            ))}
          </div>

          {/* Heatmap grid */}
          <div className="flex gap-1">
            <div className="flex flex-col gap-[2px] text-[10px] text-muted-foreground pr-1">
              {dayLabels.map((day, i) => (
                <span key={day} className="h-3 leading-3">{i % 2 === 1 ? day : ''}</span>
              ))}
            </div>

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
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-end gap-2 mt-3 text-[10px] text-muted-foreground">
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
