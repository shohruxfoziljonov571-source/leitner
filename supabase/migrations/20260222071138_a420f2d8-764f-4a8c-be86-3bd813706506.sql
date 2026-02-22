
-- Fix user_stats RLS: Remove the dangerous OR true from SELECT policy
DROP POLICY IF EXISTS "Users can view stats for leaderboard and friends" ON public.user_stats;

CREATE POLICY "Users can view stats for leaderboard and friends"
ON public.user_stats
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM friendships
      WHERE (
        (friendships.user_id = auth.uid() AND friendships.friend_id = user_stats.user_id)
        OR (friendships.friend_id = auth.uid() AND friendships.user_id = user_stats.user_id)
      )
      AND friendships.status = 'accepted'
    )
  )
);

-- Create RPC function to decrement learned_words when deleting a mastered word
CREATE OR REPLACE FUNCTION public.decrement_learned_words(p_user_id uuid, p_language_id uuid, p_delta integer DEFAULT 1)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.user_stats
  SET learned_words = GREATEST(0, COALESCE(learned_words, 0) - p_delta)
  WHERE user_id = p_user_id
    AND user_language_id = p_language_id;
END;
$$;
