
-- Subscriptions table: tracks user premium status
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'monthly', 'quarterly', 'yearly')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  starts_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Premium payments table: receipt-based manual payments
CREATE TABLE public.premium_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL CHECK (plan IN ('monthly', 'quarterly', 'yearly')),
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  receipt_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note text,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_payments ENABLE ROW LEVEL SECURITY;

-- Subscriptions RLS
CREATE POLICY "Users can view own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscription" ON public.subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions" ON public.subscriptions
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update subscriptions" ON public.subscriptions
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Payments RLS
CREATE POLICY "Users can view own payments" ON public.premium_payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create payments" ON public.premium_payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all payments" ON public.premium_payments
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update payments" ON public.premium_payments
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Storage bucket for payment receipts
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-receipts', 'payment-receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: users can upload own receipts
CREATE POLICY "Users can upload receipts" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'payment-receipts' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own receipts" ON storage.objects
  FOR SELECT USING (bucket_id = 'payment-receipts' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins can view all receipts" ON storage.objects
  FOR SELECT USING (bucket_id = 'payment-receipts' AND public.has_role(auth.uid(), 'admin'));
