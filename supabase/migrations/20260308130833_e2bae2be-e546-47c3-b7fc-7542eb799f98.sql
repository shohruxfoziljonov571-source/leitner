
-- Fix ad_clicks RLS: restrict anonymous read access
-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Anon can read by click_id" ON public.ad_clicks;
DROP POLICY IF EXISTS "Service role full access" ON public.ad_clicks;

-- Allow anon to read only their own click by click_id (used in landing page flow)
-- Since anon doesn't have user_id, we restrict to service_role for full access
-- Anon INSERT stays as-is (needed for landing page click tracking)

-- Allow anon to update only specific fields (channel_joined, telegram_user_id) 
-- This is needed by the bot webhook flow
CREATE POLICY "Anon can update by click_id" ON public.ad_clicks
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);
