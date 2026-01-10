import React, { Suspense, lazy, memo } from 'react';

// Lazy load chart components to reduce initial bundle size
const WeeklyChartLazy = lazy(() => import('./WeeklyChart'));
const AccuracyChartLazy = lazy(() => import('./AccuracyChart'));

const ChartSkeleton = () => (
  <div className="bg-card rounded-3xl shadow-card p-6 animate-pulse">
    <div className="h-6 w-32 bg-muted rounded mb-4"></div>
    <div className="h-[200px] bg-muted rounded-xl"></div>
  </div>
);

export const LazyWeeklyChart = memo(() => (
  <Suspense fallback={<ChartSkeleton />}>
    <WeeklyChartLazy />
  </Suspense>
));

LazyWeeklyChart.displayName = 'LazyWeeklyChart';

interface LazyAccuracyChartProps {
  correct: number;
  incorrect: number;
}

export const LazyAccuracyChart = memo<LazyAccuracyChartProps>(({ correct, incorrect }) => (
  <Suspense fallback={<ChartSkeleton />}>
    <AccuracyChartLazy correct={correct} incorrect={incorrect} />
  </Suspense>
));

LazyAccuracyChart.displayName = 'LazyAccuracyChart';
