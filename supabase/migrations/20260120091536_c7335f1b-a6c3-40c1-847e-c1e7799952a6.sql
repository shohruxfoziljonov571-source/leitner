-- Create trigger to validate contest referrals when a word is inserted
CREATE TRIGGER validate_contest_referrals_trigger
  AFTER INSERT ON public.words
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_contest_referrals_on_word();