
-- Allow users to view their friends' profiles
CREATE POLICY "Users can view friends profiles"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM public.friendships 
    WHERE (friendships.user_id = auth.uid() AND friendships.friend_id = profiles.user_id AND friendships.status = 'accepted')
    OR (friendships.friend_id = auth.uid() AND friendships.user_id = profiles.user_id AND friendships.status = 'accepted')
  )
);

-- Drop old restrictive policy
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Allow users to view their friends' stats
CREATE POLICY "Users can view friends stats"
ON public.user_stats
FOR SELECT
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM public.friendships 
    WHERE (friendships.user_id = auth.uid() AND friendships.friend_id = user_stats.user_id AND friendships.status = 'accepted')
    OR (friendships.friend_id = auth.uid() AND friendships.user_id = user_stats.user_id AND friendships.status = 'accepted')
  )
);

-- Drop old restrictive policy
DROP POLICY IF EXISTS "Users can view their own stats" ON public.user_stats;

-- Allow searching profiles by friend_code (public)
CREATE POLICY "Users can search by friend code"
ON public.profiles
FOR SELECT
USING (friend_code IS NOT NULL);
