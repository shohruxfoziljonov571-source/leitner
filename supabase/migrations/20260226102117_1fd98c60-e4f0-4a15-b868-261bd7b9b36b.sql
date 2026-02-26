
CREATE OR REPLACE FUNCTION public.search_words(
  p_user_id uuid,
  p_language_id uuid,
  p_query text DEFAULT '',
  p_box_number integer DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  original_word text,
  translated_word text,
  source_language text,
  target_language text,
  example_sentences text[],
  mnemonic_hint text,
  box_number integer,
  next_review_time timestamptz,
  times_reviewed integer,
  times_correct integer,
  times_incorrect integer,
  created_at timestamptz,
  last_reviewed timestamptz,
  category_id uuid,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total bigint;
BEGIN
  -- Get total count
  SELECT count(*) INTO v_total
  FROM words w
  WHERE w.user_id = p_user_id
    AND w.user_language_id = p_language_id
    AND (p_query = '' OR w.original_word ILIKE '%' || p_query || '%' OR w.translated_word ILIKE '%' || p_query || '%')
    AND (p_box_number IS NULL OR w.box_number = p_box_number);

  RETURN QUERY
  SELECT
    w.id, w.original_word, w.translated_word,
    w.source_language, w.target_language,
    w.example_sentences, w.mnemonic_hint,
    w.box_number, w.next_review_time,
    w.times_reviewed, w.times_correct, w.times_incorrect,
    w.created_at, w.last_reviewed, w.category_id,
    v_total as total_count
  FROM words w
  WHERE w.user_id = p_user_id
    AND w.user_language_id = p_language_id
    AND (p_query = '' OR w.original_word ILIKE '%' || p_query || '%' OR w.translated_word ILIKE '%' || p_query || '%')
    AND (p_box_number IS NULL OR w.box_number = p_box_number)
  ORDER BY w.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;
