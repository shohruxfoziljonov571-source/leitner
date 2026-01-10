-- Fix overly permissive RLS policy for challenge_rewards insert
DROP POLICY IF EXISTS "System can insert rewards" ON public.challenge_rewards;

-- Only allow inserts through the database function (SECURITY DEFINER)
-- Users cannot directly insert, only the process_challenge_winners function can
CREATE POLICY "No direct inserts to rewards" ON public.challenge_rewards
  FOR INSERT WITH CHECK (false);