-- Atomic XP increment for daily_stats
-- INSERT if not exists, UPDATE (increment) if exists
CREATE OR REPLACE FUNCTION public.increment_daily_xp(
  p_user_id UUID,
  p_language_id UUID,
  p_date DATE,
  p_xp INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.daily_stats (user_id, user_language_id, date, xp_earned, words_reviewed, words_correct)
  VALUES (p_user_id, p_language_id, p_date, p_xp, 0, 0)
  ON CONFLICT (user_id, user_language_id, date)
  DO UPDATE SET xp_earned = COALESCE(daily_stats.xp_earned, 0) + p_xp;
END;
$$;