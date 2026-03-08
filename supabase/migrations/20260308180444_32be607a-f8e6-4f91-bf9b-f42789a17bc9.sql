
-- Clean up duplicate words: keep the oldest entry, delete newer duplicates
DELETE FROM public.words
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, user_language_id, lower(original_word)
        ORDER BY created_at ASC
      ) AS rn
    FROM public.words
  ) sub
  WHERE rn > 1
);

-- Now create the unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_words_user_lang_original 
ON public.words (user_id, user_language_id, lower(original_word));

-- Create missing triggers
DROP TRIGGER IF EXISTS on_word_insert_validate_contest_referrals ON public.words;
DROP TRIGGER IF EXISTS on_word_insert_validate_user_referral ON public.words;

CREATE TRIGGER on_word_insert_validate_contest_referrals
  AFTER INSERT ON public.words
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_contest_referrals_on_word();

CREATE TRIGGER on_word_insert_validate_user_referral
  AFTER INSERT ON public.words
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_user_referral_on_word();
