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
      
      const email = `${tgUser.id}@leitner.uz`;
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
      // Check if we're in Telegram Mini App environment
      const tgWebApp = getTelegramWebApp();
      
      if (tgWebApp?.initDataUnsafe?.user) {
        const tgUser = tgWebApp.initDataUnsafe.user as TelegramUser;
        setTelegramUser(tgUser);
        setIsTelegramUser(true);
        
        // Notify Telegram that app is ready
        tgWebApp.ready();
        tgWebApp.expand();
        
        // CRITICAL: Check if current session belongs to a DIFFERENT Telegram user
        // This happens when user switches Telegram accounts on the same device
        if (session) {
          const currentEmail = session.user.email;
          const expectedEmail = `${tgUser.id}@leitner.uz`;
          
          // If emails don't match, the session is from a different Telegram account
          if (currentEmail !== expectedEmail) {
            console.log('Telegram account mismatch detected!');
            console.log('Current session email:', currentEmail);
            console.log('Expected email:', expectedEmail);
            
            // Sign out the old session first
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            
            // Now authenticate with the correct Telegram account
            console.log('Re-authenticating with correct Telegram account...');
            await authenticateWithTelegram(tgUser);
          } else {
            // Session matches current Telegram user, just update profile data
            console.log('Session matches Telegram user, updating profile...');
            await supabase
              .from('profiles')
              .update({
                telegram_chat_id: tgUser.id,
                telegram_username: tgUser.username || null,
                avatar_url: tgUser.photo_url || null,
                telegram_connected_at: new Date().toISOString(),
              })
              .eq('user_id', session.user.id);
            
            setSession(session);
            setUser(session.user);
          }
        } else {
          // No session, try to auto-login with Telegram
          console.log('No session, attempting Telegram auto-login...');
          await authenticateWithTelegram(tgUser);
        }
        
        setTelegramAuthAttempted(true);
      } else {
        // Not in Telegram environment, use existing session
        setSession(session);
        setUser(session?.user ?? null);
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
