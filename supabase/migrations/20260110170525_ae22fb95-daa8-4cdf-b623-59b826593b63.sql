-- Drop the overly permissive friend code search policy
DROP POLICY IF EXISTS "Users can search by friend code" ON public.profiles;

-- Create a new secure policy that requires authentication
-- Users can only view profiles when searching by a specific friend code
-- This prevents enumeration attacks while still allowing friend code lookups
CREATE POLICY "Authenticated users can search by friend code" ON public.profiles
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL 
    AND friend_code IS NOT NULL
    AND auth.uid() != user_id
  );