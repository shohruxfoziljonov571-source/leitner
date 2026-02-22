
CREATE OR REPLACE FUNCTION public.get_global_leaderboard(p_limit integer DEFAULT 50)
RETURNS TABLE(
  user_id uuid,
  full_name text,
  avatar_url text,
  total_xp bigint,
  max_level integer,
  max_streak integer,
  total_words bigint,
  rank bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.user_id,
    COALESCE(p.full_name, 'Foydalanuvchi') as full_name,
    p.avatar_url,
    COALESCE(SUM(s.xp), 0)::bigint as total_xp,
    COALESCE(MAX(s.level), 1)::integer as max_level,
    COALESCE(MAX(s.streak), 0)::integer as max_streak,
    COALESCE(SUM(s.total_words), 0)::bigint as total_words,
    ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(s.xp), 0) DESC) as rank
  FROM user_stats s
  LEFT JOIN profiles p ON p.user_id = s.user_id
  GROUP BY s.user_id, p.full_name, p.avatar_url
  ORDER BY total_xp DESC
  LIMIT p_limit;
END;
$$;
