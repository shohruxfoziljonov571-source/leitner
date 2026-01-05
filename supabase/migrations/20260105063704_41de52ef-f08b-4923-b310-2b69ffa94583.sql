-- Add telegram_chat_id to profiles for bot notifications
ALTER TABLE public.profiles 
ADD COLUMN telegram_chat_id BIGINT,
ADD COLUMN telegram_username TEXT,
ADD COLUMN telegram_connected_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster lookups
CREATE INDEX idx_profiles_telegram_chat_id ON public.profiles(telegram_chat_id) WHERE telegram_chat_id IS NOT NULL;

-- Create notification_settings table
CREATE TABLE public.notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  telegram_enabled BOOLEAN NOT NULL DEFAULT false,
  daily_reminder_time TIME DEFAULT '09:00',
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for notification_settings
CREATE POLICY "Users can view their own notification settings"
  ON public.notification_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification settings"
  ON public.notification_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification settings"
  ON public.notification_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Create trigger for notification_settings updated_at
CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();