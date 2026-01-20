-- Table for scheduled messages
CREATE TABLE public.scheduled_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message TEXT NOT NULL,
  target_group TEXT NOT NULL DEFAULT 'all',
  include_button BOOLEAN DEFAULT true,
  button_text TEXT DEFAULT '📚 Ilovani ochish',
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending',
  total_sent INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;

-- Only admins can manage scheduled messages
CREATE POLICY "Admins can manage scheduled messages" 
ON public.scheduled_messages 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Table for user feedback/support
CREATE TABLE public.user_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  admin_response TEXT,
  responded_by UUID,
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- Users can create and view their own feedback
CREATE POLICY "Users can create feedback" 
ON public.user_feedback 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own feedback" 
ON public.user_feedback 
FOR SELECT 
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Admins can manage all feedback
CREATE POLICY "Admins can update feedback" 
ON public.user_feedback 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Table for achievements configuration (admin managed)
CREATE TABLE public.achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🏆',
  category TEXT NOT NULL DEFAULT 'general',
  requirement_type TEXT NOT NULL,
  requirement_value INTEGER NOT NULL,
  xp_reward INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

-- Everyone can view active achievements
CREATE POLICY "Anyone can view active achievements" 
ON public.achievements 
FOR SELECT 
USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

-- Only admins can manage achievements
CREATE POLICY "Admins can manage achievements" 
ON public.achievements 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add is_blocked column to profiles for user management
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS blocked_reason TEXT;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_status ON public.scheduled_messages(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_scheduled_at ON public.scheduled_messages(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON public.user_feedback(status);
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON public.user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_code ON public.achievements(code);