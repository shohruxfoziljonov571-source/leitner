-- 1. Partial index for valid referrals (faster contest leaderboard + premium check)
CREATE INDEX IF NOT EXISTS idx_user_referrals_valid 
ON public.user_referrals(referrer_user_id) 
WHERE is_valid = true;

-- 2. Server-side premium check helper (prevents client bypass)
CREATE OR REPLACE FUNCTION public.is_user_premium(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM subscriptions
    WHERE user_id = p_user_id
      AND status = 'active'
      AND plan <> 'free'
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

-- 3. Admin dashboard aggregate stats (bypasses 1000-row limit)
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN '{}'::jsonb;
  END IF;

  SELECT jsonb_build_object(
    'total_users', (SELECT count(*) FROM profiles),
    'active_users_7d', (
      SELECT count(DISTINCT user_id) FROM daily_stats 
      WHERE date >= CURRENT_DATE - 7
    ),
    'active_users_30d', (
      SELECT count(DISTINCT user_id) FROM daily_stats 
      WHERE date >= CURRENT_DATE - 30
    ),
    'new_users_today', (
      SELECT count(*) FROM profiles WHERE created_at::date = CURRENT_DATE
    ),
    'new_users_7d', (
      SELECT count(*) FROM profiles WHERE created_at >= CURRENT_DATE - 7
    ),
    'total_words', (SELECT COALESCE(SUM(total_words), 0) FROM user_stats),
    'total_reviews', (SELECT COALESCE(SUM(words_reviewed), 0) FROM daily_stats),
    'premium_users', (
      SELECT count(*) FROM subscriptions
      WHERE status = 'active' AND plan <> 'free'
        AND (expires_at IS NULL OR expires_at > now())
    ),
    'pending_payments', (
      SELECT count(*) FROM premium_payments WHERE status = 'pending'
    ),
    'telegram_connected', (
      SELECT count(*) FROM profiles WHERE telegram_chat_id IS NOT NULL
    ),
    'total_referrals', (SELECT count(*) FROM user_referrals),
    'valid_referrals', (SELECT count(*) FROM user_referrals WHERE is_valid = true),
    'open_feedback', (SELECT count(*) FROM user_feedback WHERE status = 'open')
  ) INTO result;

  RETURN result;
END;
$$;