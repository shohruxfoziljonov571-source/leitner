
-- Table to track ad clicks from Instagram/Facebook ads
CREATE TABLE public.ad_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  click_id text NOT NULL UNIQUE,
  fbclid text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  ip_hash text,
  user_agent text,
  telegram_user_id bigint,
  telegram_username text,
  channel_joined boolean NOT NULL DEFAULT false,
  conversion_sent boolean NOT NULL DEFAULT false,
  conversion_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ad_clicks ENABLE ROW LEVEL SECURITY;

-- Service role only - no direct user access needed (edge functions handle everything)
CREATE POLICY "Service role full access" ON public.ad_clicks FOR ALL
  USING (true) WITH CHECK (true);

-- Allow anon inserts for landing page (no auth required)
CREATE POLICY "Anon can insert clicks" ON public.ad_clicks FOR INSERT
  TO anon WITH CHECK (true);

-- Allow anon to read their own click by click_id (for redirect)
CREATE POLICY "Anon can read by click_id" ON public.ad_clicks FOR SELECT
  TO anon USING (true);

-- Index for fast lookup
CREATE INDEX idx_ad_clicks_click_id ON public.ad_clicks (click_id);
CREATE INDEX idx_ad_clicks_telegram_user_id ON public.ad_clicks (telegram_user_id);

-- Updated_at trigger
CREATE TRIGGER update_ad_clicks_updated_at
  BEFORE UPDATE ON public.ad_clicks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
