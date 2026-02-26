
CREATE OR REPLACE FUNCTION public.get_box_counts(p_user_id uuid, p_language_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_object_agg(box_number::text, cnt)
  INTO result
  FROM (
    SELECT box_number, count(*)::integer as cnt
    FROM words
    WHERE user_id = p_user_id AND user_language_id = p_language_id
    GROUP BY box_number
  ) sub;
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_review_count(p_user_id uuid, p_language_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  cnt integer;
BEGIN
  SELECT count(*)::integer INTO cnt
  FROM words
  WHERE user_id = p_user_id
    AND user_language_id = p_language_id
    AND next_review_time <= now();
  RETURN cnt;
END;
$$;
