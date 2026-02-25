
-- Drop overly permissive policy on contest_participants
DROP POLICY IF EXISTS "Anyone can view participants" ON public.contest_participants;

-- Create a more restrictive policy: authenticated users can view, but sensitive fields are still visible
-- Better approach: allow authenticated users to view only non-sensitive columns via a view
-- For now, restrict to authenticated users only (not anonymous)
CREATE POLICY "Authenticated users can view participants" 
  ON public.contest_participants 
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);
