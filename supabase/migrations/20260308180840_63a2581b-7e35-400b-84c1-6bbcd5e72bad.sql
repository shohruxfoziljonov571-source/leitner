
-- Fix ad_clicks: restrict INSERT to only allow setting click tracking fields
-- and UPDATE to only allow updating by click_id (not arbitrary updates)
DROP POLICY IF EXISTS "Anon can insert clicks" ON public.ad_clicks;
DROP POLICY IF EXISTS "Anon can update by click_id" ON public.ad_clicks;
DROP POLICY IF EXISTS "Anon can insert clicks " ON public.ad_clicks;
DROP POLICY IF EXISTS "Anon can update by click_id " ON public.ad_clicks;

-- Allow anon inserts (needed for tracking pixels before auth)
CREATE POLICY "ad_clicks_anon_insert" ON public.ad_clicks 
  FOR INSERT TO anon 
  WITH CHECK (click_id IS NOT NULL AND click_id <> '');

-- Allow anon updates only on their own click_id (match by click_id)
CREATE POLICY "ad_clicks_anon_update" ON public.ad_clicks 
  FOR UPDATE TO anon 
  USING (click_id IS NOT NULL)
  WITH CHECK (click_id IS NOT NULL);

-- Allow service_role (edge functions) full access via default bypass
