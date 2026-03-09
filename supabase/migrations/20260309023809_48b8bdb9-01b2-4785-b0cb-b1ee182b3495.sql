
-- Funnel analytics RPC: aggregates ad_clicks data for funnel visualization
CREATE OR REPLACE FUNCTION public.get_ad_funnel_stats(
  p_days integer DEFAULT 30,
  p_utm_campaign text DEFAULT NULL,
  p_utm_source text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  v_since timestamptz := now() - (p_days || ' days')::interval;
BEGIN
  -- Only admins can call this
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN '{}'::jsonb;
  END IF;

  SELECT jsonb_build_object(
    'total_clicks', (
      SELECT count(*) FROM ad_clicks
      WHERE created_at >= v_since
        AND (p_utm_campaign IS NULL OR utm_campaign = p_utm_campaign)
        AND (p_utm_source IS NULL OR utm_source = p_utm_source)
    ),
    'bot_starts', (
      SELECT count(*) FROM ad_clicks
      WHERE telegram_user_id IS NOT NULL
        AND created_at >= v_since
        AND (p_utm_campaign IS NULL OR utm_campaign = p_utm_campaign)
        AND (p_utm_source IS NULL OR utm_source = p_utm_source)
    ),
    'channel_joins', (
      SELECT count(*) FROM ad_clicks
      WHERE channel_joined = true
        AND created_at >= v_since
        AND (p_utm_campaign IS NULL OR utm_campaign = p_utm_campaign)
        AND (p_utm_source IS NULL OR utm_source = p_utm_source)
    ),
    'conversions_sent', (
      SELECT count(*) FROM ad_clicks
      WHERE conversion_sent = true
        AND created_at >= v_since
        AND (p_utm_campaign IS NULL OR utm_campaign = p_utm_campaign)
        AND (p_utm_source IS NULL OR utm_source = p_utm_source)
    ),
    'by_campaign', (
      SELECT COALESCE(jsonb_agg(row_to_json(sub)), '[]'::jsonb)
      FROM (
        SELECT 
          COALESCE(utm_campaign, 'direct') as campaign,
          COALESCE(utm_source, 'unknown') as source,
          count(*) as clicks,
          count(*) FILTER (WHERE telegram_user_id IS NOT NULL) as bot_starts,
          count(*) FILTER (WHERE channel_joined = true) as channel_joins,
          count(*) FILTER (WHERE conversion_sent = true) as conversions
        FROM ad_clicks
        WHERE created_at >= v_since
        GROUP BY utm_campaign, utm_source
        ORDER BY clicks DESC
        LIMIT 20
      ) sub
    ),
    'daily_clicks', (
      SELECT COALESCE(jsonb_agg(row_to_json(sub)), '[]'::jsonb)
      FROM (
        SELECT 
          created_at::date as date,
          count(*) as clicks,
          count(*) FILTER (WHERE telegram_user_id IS NOT NULL) as bot_starts,
          count(*) FILTER (WHERE channel_joined = true) as channel_joins,
          count(*) FILTER (WHERE conversion_sent = true) as conversions
        FROM ad_clicks
        WHERE created_at >= v_since
        GROUP BY created_at::date
        ORDER BY date DESC
        LIMIT 30
      ) sub
    )
  ) INTO result;

  RETURN result;
END;
$$;
