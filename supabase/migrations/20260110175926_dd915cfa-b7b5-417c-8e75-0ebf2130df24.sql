-- Create weekly_challenges table
CREATE TABLE public.weekly_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(week_start)
);

-- Create weekly_challenge_participants table
CREATE TABLE public.weekly_challenge_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES public.weekly_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  xp_earned INTEGER DEFAULT 0,
  words_reviewed INTEGER DEFAULT 0,
  words_correct INTEGER DEFAULT 0,
  days_active INTEGER DEFAULT 0,
  rank INTEGER,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);

-- Enable RLS
ALTER TABLE public.weekly_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_challenge_participants ENABLE ROW LEVEL SECURITY;

-- Policies for weekly_challenges (read-only for authenticated users)
CREATE POLICY "Anyone can view active challenges"
ON public.weekly_challenges
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Policies for weekly_challenge_participants
CREATE POLICY "Users can view all participants"
ON public.weekly_challenge_participants
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can join challenges"
ON public.weekly_challenge_participants
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participation"
ON public.weekly_challenge_participants
FOR UPDATE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_challenge_participants_challenge ON public.weekly_challenge_participants(challenge_id);
CREATE INDEX idx_challenge_participants_user ON public.weekly_challenge_participants(user_id);
CREATE INDEX idx_challenge_participants_xp ON public.weekly_challenge_participants(xp_earned DESC);

-- Function to get or create current week's challenge
CREATE OR REPLACE FUNCTION public.get_or_create_weekly_challenge()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  challenge_id UUID;
  week_start_date DATE;
  week_end_date DATE;
BEGIN
  -- Calculate Monday of current week
  week_start_date := date_trunc('week', CURRENT_DATE)::DATE;
  week_end_date := week_start_date + INTERVAL '6 days';
  
  -- Try to get existing challenge
  SELECT id INTO challenge_id
  FROM weekly_challenges
  WHERE week_start = week_start_date;
  
  -- Create if not exists
  IF challenge_id IS NULL THEN
    INSERT INTO weekly_challenges (week_start, week_end, is_active)
    VALUES (week_start_date, week_end_date, true)
    RETURNING id INTO challenge_id;
  END IF;
  
  RETURN challenge_id;
END;
$$;