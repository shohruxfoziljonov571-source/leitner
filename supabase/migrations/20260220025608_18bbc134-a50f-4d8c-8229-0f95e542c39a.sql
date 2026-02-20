
-- 1. Atomic increment for daily_stats (words_reviewed + words_correct)
CREATE OR REPLACE FUNCTION public.increment_daily_words(
  p_user_id uuid,
  p_language_id uuid,
  p_date date,
  p_reviewed integer DEFAULT 1,
  p_correct integer DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.daily_stats (user_id, user_language_id, date, words_reviewed, words_correct, xp_earned)
  VALUES (p_user_id, p_language_id, p_date, p_reviewed, p_correct, 0)
  ON CONFLICT (user_id, user_language_id, date)
  DO UPDATE SET
    words_reviewed = COALESCE(daily_stats.words_reviewed, 0) + p_reviewed,
    words_correct  = COALESCE(daily_stats.words_correct,  0) + p_correct;
END;
$$;

-- 2. Atomic increment for user_stats total_words (avoids race conditions)
CREATE OR REPLACE FUNCTION public.increment_total_words(
  p_user_id uuid,
  p_language_id uuid,
  p_delta integer DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.user_stats
  SET total_words = GREATEST(0, COALESCE(total_words, 0) + p_delta)
  WHERE user_id = p_user_id
    AND user_language_id = p_language_id;
END;
$$;

-- 3. Atomic increment for user_stats today_reviewed / today_correct / learned_words
CREATE OR REPLACE FUNCTION public.increment_review_stats(
  p_user_id uuid,
  p_language_id uuid,
  p_reviewed integer DEFAULT 1,
  p_correct integer DEFAULT 0,
  p_learned integer DEFAULT 0,
  p_date date DEFAULT CURRENT_DATE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.user_stats
  SET
    today_reviewed  = COALESCE(today_reviewed, 0) + p_reviewed,
    today_correct   = COALESCE(today_correct, 0) + p_correct,
    learned_words   = COALESCE(learned_words, 0) + p_learned,
    last_active_date = p_date
  WHERE user_id = p_user_id
    AND user_language_id = p_language_id;
END;
$$;
