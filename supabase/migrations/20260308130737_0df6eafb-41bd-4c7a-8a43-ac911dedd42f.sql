
-- Function to check and expire subscriptions server-side
CREATE OR REPLACE FUNCTION public.get_active_subscription(p_user_id uuid)
RETURNS TABLE(
  id uuid,
  plan text,
  status text,
  starts_at timestamptz,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Auto-expire if needed
  UPDATE subscriptions s
  SET status = 'expired', plan = 'free', updated_at = now()
  WHERE s.user_id = p_user_id
    AND s.expires_at IS NOT NULL
    AND s.expires_at < now()
    AND s.status = 'active'
    AND s.plan != 'free';

  RETURN QUERY
  SELECT s.id, s.plan, s.status, s.starts_at, s.expires_at
  FROM subscriptions s
  WHERE s.user_id = p_user_id
  LIMIT 1;
END;
$$;
