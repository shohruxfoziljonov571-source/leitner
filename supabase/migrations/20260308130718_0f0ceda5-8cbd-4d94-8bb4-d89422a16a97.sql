
-- 1. Replace increment_review_stats to auto-reset daily counters and handle streak
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
DECLARE
  v_last_date date;
  v_daily_goal integer;
  v_old_reviewed integer;
  v_new_reviewed integer;
  v_streak integer;
BEGIN
  -- Get current stats
  SELECT last_active_date, daily_goal, today_reviewed, streak
  INTO v_last_date, v_daily_goal, v_old_reviewed, v_streak
  FROM user_stats
  WHERE user_id = p_user_id AND user_language_id = p_language_id;

  -- If no stats row exists, nothing to update
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- If it's a new day, reset daily counters first
  IF v_last_date < p_date THEN
    -- Check if yesterday's goal was met for streak
    IF v_last_date = p_date - 1 AND v_old_reviewed >= v_daily_goal THEN
      -- Consecutive day with goal met: increment streak
      v_streak := v_streak + 1;
    ELSIF v_last_date = p_date - 1 AND v_old_reviewed < v_daily_goal THEN
      -- Consecutive day but goal NOT met: reset streak
      v_streak := 0;
    ELSIF v_last_date < p_date - 1 THEN
      -- Missed day(s): reset streak
      v_streak := 0;
    END IF;

    -- Reset daily counters for new day
    UPDATE user_stats
    SET today_reviewed = p_reviewed,
        today_correct = p_correct,
        learned_words = COALESCE(learned_words, 0) + p_learned,
        last_active_date = p_date,
        streak = v_streak
    WHERE user_id = p_user_id AND user_language_id = p_language_id;
  ELSE
    -- Same day: just increment
    UPDATE user_stats
    SET today_reviewed = COALESCE(today_reviewed, 0) + p_reviewed,
        today_correct = COALESCE(today_correct, 0) + p_correct,
        learned_words = COALESCE(learned_words, 0) + p_learned,
        last_active_date = p_date
    WHERE user_id = p_user_id AND user_language_id = p_language_id;
  END IF;

  -- After increment, check if streak should start (first time reaching goal today)
  SELECT today_reviewed INTO v_new_reviewed
  FROM user_stats
  WHERE user_id = p_user_id AND user_language_id = p_language_id;

  -- If just crossed the daily goal threshold, and streak was 0, set to 1
  IF v_new_reviewed >= v_daily_goal AND (v_new_reviewed - p_reviewed) < v_daily_goal THEN
    UPDATE user_stats
    SET streak = GREATEST(streak, 1)
    WHERE user_id = p_user_id AND user_language_id = p_language_id;
  END IF;
END;
$$;

-- 2. Add UNIQUE constraint on subscriptions(user_id) to prevent duplicates
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_user_id_unique UNIQUE (user_id);
