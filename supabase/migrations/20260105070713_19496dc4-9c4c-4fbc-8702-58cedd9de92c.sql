-- Add gamification columns to user_stats table
ALTER TABLE public.user_stats 
ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS achievements TEXT[] DEFAULT '{}';

-- Create daily_stats table for charts
CREATE TABLE IF NOT EXISTS public.daily_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_language_id UUID NOT NULL REFERENCES public.user_languages(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  words_reviewed INTEGER DEFAULT 0,
  words_correct INTEGER DEFAULT 0,
  xp_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, user_language_id, date)
);

-- Enable RLS
ALTER TABLE public.daily_stats ENABLE ROW LEVEL SECURITY;

-- RLS policies for daily_stats
CREATE POLICY "Users can view their own daily stats"
ON public.daily_stats
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily stats"
ON public.daily_stats
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily stats"
ON public.daily_stats
FOR UPDATE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_daily_stats_user_date ON public.daily_stats(user_id, user_language_id, date);