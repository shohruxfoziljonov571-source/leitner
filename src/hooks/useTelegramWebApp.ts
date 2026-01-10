import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
  is_premium?: boolean;
}

interface TelegramWebApp {
  ready: () => void;
  close: () => void;
  expand: () => void;
  initData: string;
  initDataUnsafe: {
    query_id?: string;
    user?: TelegramUser;
    auth_date?: number;
    hash?: string;
    start_param?: string;
  };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
  };
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    isProgressVisible: boolean;
    setText: (text: string) => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
  };
  BackButton: {
    isVisible: boolean;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
  };
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  showAlert: (message: string, callback?: () => void) => void;
  showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
  showPopup: (params: {
    title?: string;
    message: string;
    buttons?: Array<{
      id?: string;
      type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive';
      text?: string;
    }>;
  }, callback?: (buttonId: string) => void) => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  enableClosingConfirmation: () => void;
  disableClosingConfirmation: () => void;
}

export const useTelegramWebApp = () => {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isTelegramEnvironment, setIsTelegramEnvironment] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    // Check if we're in Telegram Mini App environment
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const tgWebApp = window.Telegram.WebApp;
      setWebApp(tgWebApp);
      setIsTelegramEnvironment(true);
      
      // Get user from initDataUnsafe
      if (tgWebApp.initDataUnsafe?.user) {
        setUser(tgWebApp.initDataUnsafe.user);
      }

      // Notify Telegram that the app is ready
      tgWebApp.ready();
      tgWebApp.expand();
      
      setIsReady(true);
    }
  }, []);

  const authenticateWithTelegram = useCallback(async () => {
    if (!webApp || !user || isAuthenticating) return null;

    setIsAuthenticating(true);

    try {
      // Check if user already exists with this telegram_chat_id
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('telegram_chat_id', user.id)
        .maybeSingle();

      if (existingProfile) {
        // User already linked - try to sign in
        // For now, we'll need a custom auth solution or magic link
        console.log('User already linked:', existingProfile.user_id);
        return existingProfile.user_id;
      }

      // Create new user with Telegram data
      const email = `${user.id}@leitner.uz`;
      const password = `tg_${user.id}_${webApp.initDataUnsafe.auth_date || Date.now()}`;
      
      // Try to sign up
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`,
            telegram_id: user.id,
            telegram_username: user.username,
            avatar_url: user.photo_url,
          }
        }
      });

      if (signUpError) {
        // User might already exist, try to sign in
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          console.error('Error signing in:', signInError);
          return null;
        }

        // Update profile with latest Telegram data
        if (signInData.user) {
          await supabase
            .from('profiles')
            .update({
              telegram_chat_id: user.id,
              telegram_username: user.username,
              full_name: `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`,
              avatar_url: user.photo_url,
              telegram_connected_at: new Date().toISOString(),
            })
            .eq('user_id', signInData.user.id);
        }

        return signInData.user?.id;
      }

      // Update the newly created profile with Telegram data
      if (signUpData.user) {
        // Wait a bit for the trigger to create the profile
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await supabase
          .from('profiles')
          .update({
            telegram_chat_id: user.id,
            telegram_username: user.username,
            full_name: `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`,
            avatar_url: user.photo_url,
            telegram_connected_at: new Date().toISOString(),
          })
          .eq('user_id', signUpData.user.id);
      }

      return signUpData.user?.id;
    } catch (error) {
      console.error('Error authenticating with Telegram:', error);
      return null;
    } finally {
      setIsAuthenticating(false);
    }
  }, [webApp, user, isAuthenticating]);

  const hapticFeedback = useCallback((type: 'success' | 'error' | 'warning' | 'light' | 'medium' | 'heavy') => {
    if (!webApp?.HapticFeedback) return;
    
    if (['success', 'error', 'warning'].includes(type)) {
      webApp.HapticFeedback.notificationOccurred(type as 'success' | 'error' | 'warning');
    } else {
      webApp.HapticFeedback.impactOccurred(type as 'light' | 'medium' | 'heavy');
    }
  }, [webApp]);

  const showMainButton = useCallback((text: string, onClick: () => void) => {
    if (!webApp?.MainButton) return;
    
    webApp.MainButton.setText(text);
    webApp.MainButton.onClick(onClick);
    webApp.MainButton.show();
  }, [webApp]);

  const hideMainButton = useCallback(() => {
    if (!webApp?.MainButton) return;
    webApp.MainButton.hide();
  }, [webApp]);

  const showBackButton = useCallback((onClick: () => void) => {
    if (!webApp?.BackButton) return;
    
    webApp.BackButton.onClick(onClick);
    webApp.BackButton.show();
  }, [webApp]);

  const hideBackButton = useCallback(() => {
    if (!webApp?.BackButton) return;
    webApp.BackButton.hide();
  }, [webApp]);

  const closeApp = useCallback(() => {
    if (!webApp) return;
    webApp.close();
  }, [webApp]);

  return {
    webApp,
    user,
    isReady,
    isTelegramEnvironment,
    isAuthenticating,
    authenticateWithTelegram,
    hapticFeedback,
    showMainButton,
    hideMainButton,
    showBackButton,
    hideBackButton,
    closeApp,
  };
};
