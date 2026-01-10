-- Fix RLS policies for profiles table to allow viewing pending friend requests
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view friends profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can search by friend code" ON public.profiles;

-- Allow users to view their own profile, friends (accepted or pending), and global leaderboard data
CREATE POLICY "Users can view profiles for leaderboard and friends"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    -- Own profile
    auth.uid() = user_id
    -- OR searching by friend code
    OR friend_code IS NOT NULL
    -- OR has any friendship (pending or accepted)
    OR EXISTS (
      SELECT 1 FROM friendships
      WHERE (
        (friendships.user_id = auth.uid() AND friendships.friend_id = profiles.user_id)
        OR (friendships.friend_id = auth.uid() AND friendships.user_id = profiles.user_id)
      )
      AND friendships.status IN ('pending', 'accepted')
    )
  )
);

-- Fix RLS policies for user_stats to allow viewing pending friends and global leaderboard
DROP POLICY IF EXISTS "Users can view friends stats" ON public.user_stats;

-- Allow users to view own stats, friends stats (pending or accepted), and global leaderboard
CREATE POLICY "Users can view stats for leaderboard and friends"
ON public.user_stats
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    -- Own stats
    auth.uid() = user_id
    -- OR has any friendship (pending or accepted)
    OR EXISTS (
      SELECT 1 FROM friendships
      WHERE (
        (friendships.user_id = auth.uid() AND friendships.friend_id = user_stats.user_id)
        OR (friendships.friend_id = auth.uid() AND friendships.user_id = user_stats.user_id)
      )
      AND friendships.status IN ('pending', 'accepted')
    )
    -- OR global leaderboard (all authenticated users can see each other's stats)
    OR true
  )
);