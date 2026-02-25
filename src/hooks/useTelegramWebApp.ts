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
      // All auth is now handled by AuthContext via the telegram-auth edge function.
      // This method is kept for backward compatibility but delegates to the edge function.
      const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/telegram-auth`;
      
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: webApp.initData }),
      });

      if (!resp.ok) {
        console.error('Telegram auth failed:', resp.status);
        return null;
      }

      const result = await resp.json();
      
      if (result.access_token && result.refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token: result.access_token,
          refresh_token: result.refresh_token,
        });
        if (error) {
          console.error('Failed to set session:', error);
          return null;
        }
        return result.user?.id;
      }

      return null;
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
