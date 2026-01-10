import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isTelegramUser: boolean;
  telegramUser: TelegramUser | null;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to get Telegram WebApp data
const getTelegramWebApp = () => {
  if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
    return (window as any).Telegram.WebApp;
  }
  return null;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTelegramUser, setIsTelegramUser] = useState(false);
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  const [telegramAuthAttempted, setTelegramAuthAttempted] = useState(false);

  // Telegram auto-login function
  const authenticateWithTelegram = useCallback(async (tgUser: TelegramUser) => {
    try {
      console.log('Attempting Telegram auto-login for:', tgUser.first_name);
      
      const email = `tg_${tgUser.id}@telegram.leitner.app`;
      const password = `tg_secure_${tgUser.id}_leitner_app_2024`;
      
      // First try to sign in (existing user)
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!signInError && signInData.user) {
        console.log('Telegram user signed in successfully');
        
        // Update profile with latest Telegram data
        await supabase
          .from('profiles')
          .update({
            telegram_chat_id: tgUser.id,
            telegram_username: tgUser.username || null,
            full_name: `${tgUser.first_name}${tgUser.last_name ? ' ' + tgUser.last_name : ''}`,
            avatar_url: tgUser.photo_url || null,
            telegram_connected_at: new Date().toISOString(),
          })
          .eq('user_id', signInData.user.id);

        return true;
      }

      // If sign in failed, try to sign up (new user)
      console.log('Sign in failed, attempting sign up...');
      
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: `${tgUser.first_name}${tgUser.last_name ? ' ' + tgUser.last_name : ''}`,
            telegram_id: tgUser.id,
            telegram_username: tgUser.username,
            avatar_url: tgUser.photo_url,
          }
        }
      });

      if (signUpError) {
        console.error('Telegram sign up error:', signUpError);
        return false;
      }

      if (signUpData.user) {
        console.log('Telegram user signed up successfully');
        
        // Wait for profile trigger, then update with Telegram data
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        await supabase
          .from('profiles')
          .update({
            telegram_chat_id: tgUser.id,
            telegram_username: tgUser.username || null,
            full_name: `${tgUser.first_name}${tgUser.last_name ? ' ' + tgUser.last_name : ''}`,
            avatar_url: tgUser.photo_url || null,
            telegram_connected_at: new Date().toISOString(),
          })
          .eq('user_id', signUpData.user.id);

        // Enable telegram notifications
        await supabase
          .from('notification_settings')
          .upsert({
            user_id: signUpData.user.id,
            telegram_enabled: true,
          }, { onConflict: 'user_id' });

        return true;
      }

      return false;
    } catch (error) {
      console.error('Telegram authentication error:', error);
      return false;
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Only set loading to false if we're not waiting for Telegram auth
        if (!getTelegramWebApp()?.initDataUnsafe?.user || telegramAuthAttempted) {
          setIsLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // Check if we're in Telegram Mini App environment
      const tgWebApp = getTelegramWebApp();
      
      if (tgWebApp?.initDataUnsafe?.user) {
        const tgUser = tgWebApp.initDataUnsafe.user as TelegramUser;
        setTelegramUser(tgUser);
        setIsTelegramUser(true);
        
        // Notify Telegram that app is ready
        tgWebApp.ready();
        tgWebApp.expand();
        
        // If no session, try to auto-login with Telegram
        if (!session) {
          console.log('No session, attempting Telegram auto-login...');
          await authenticateWithTelegram(tgUser);
        } else {
          // User already logged in, just update Telegram data
          console.log('User already logged in, updating Telegram data...');
          await supabase
            .from('profiles')
            .update({
              telegram_chat_id: tgUser.id,
              telegram_username: tgUser.username || null,
              avatar_url: tgUser.photo_url || null,
              telegram_connected_at: new Date().toISOString(),
            })
            .eq('user_id', session.user.id);
        }
        
        setTelegramAuthAttempted(true);
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [authenticateWithTelegram, telegramAuthAttempted]);

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        }
      }
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      isLoading, 
      isTelegramUser,
      telegramUser,
      signUp, 
      signIn, 
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
