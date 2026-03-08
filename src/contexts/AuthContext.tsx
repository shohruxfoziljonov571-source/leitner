import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
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
  telegramAuthError: string | null;
  isPasswordRecovery: boolean;
  clearPasswordRecovery: () => void;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getTelegramWebApp = () => {
  if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
    return (window as any).Telegram.WebApp;
  }
  return null;
};

const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;

/**
 * Authenticates with Telegram using server-side HMAC validation.
 */
async function authenticateWithTelegramServer(initData: string): Promise<{
  access_token: string;
  refresh_token: string;
  user: User;
} | null> {
  try {
    const url = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/telegram-auth`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      console.error('Telegram auth failed:', err.error || resp.status);
      return null;
    }

    return await resp.json();
  } catch (error) {
    console.error('Telegram auth request error:', error);
    return null;
  }
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTelegramUser, setIsTelegramUser] = useState(false);
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  const [telegramAuthError, setTelegramAuthError] = useState<string | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  
  const initRef = useRef(false);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      // Track referral on first sign-in (after email confirmation)
      if (_event === 'SIGNED_IN' && session?.user) {
        const refCode = localStorage.getItem('referral_code');
        if (refCode) {
          try {
            const { data: referrerProfile } = await supabase
              .from('profiles')
              .select('user_id')
              .eq('friend_code', refCode)
              .single();

            if (referrerProfile && referrerProfile.user_id !== session.user.id) {
              await supabase.from('user_referrals').insert({
                referrer_user_id: referrerProfile.user_id,
                referred_user_id: session.user.id,
              });
            }
            localStorage.removeItem('referral_code');
          } catch (e) {
            console.error('Referral tracking error:', e);
          }
        }
      }
    });

    const initialize = async () => {
      // Guard against double init (React Strict Mode)
      if (initRef.current) return;
      initRef.current = true;

      const tgWebApp = getTelegramWebApp();

      if (tgWebApp?.initDataUnsafe?.user && tgWebApp.initData) {
        const tgUser = tgWebApp.initDataUnsafe.user as TelegramUser;
        setTelegramUser(tgUser);
        setIsTelegramUser(true);

        tgWebApp.ready();
        tgWebApp.expand();

        // Check if current session already belongs to this Telegram user
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        const expectedEmail = `${tgUser.id}@leitner.uz`;

        if (existingSession && existingSession.user.email === expectedEmail) {
          // Valid session for correct user
          setSession(existingSession);
          setUser(existingSession.user);

          // Update profile silently in background
          supabase.from('profiles').update({
            telegram_chat_id: tgUser.id,
            telegram_username: tgUser.username || null,
            avatar_url: tgUser.photo_url || null,
            telegram_connected_at: new Date().toISOString(),
          }).eq('user_id', existingSession.user.id);
        } else {
          // No valid session or wrong user — authenticate via edge function
          if (existingSession) {
            await supabase.auth.signOut();
          }

          const authResult = await authenticateWithTelegramServer(tgWebApp.initData);

          if (authResult) {
            const { error } = await supabase.auth.setSession({
              access_token: authResult.access_token,
              refresh_token: authResult.refresh_token,
            });

            if (error) {
              console.error('Failed to set session:', error);
              setTelegramAuthError('Sessiya o\'rnatishda xatolik yuz berdi');
            }
          } else {
            setTelegramAuthError('Telegram orqali kirish muvaffaqiyatsiz bo\'ldi. Iltimos, ilovani qayta oching.');
          }
        }
      } else {
        // Regular web user — use existing session
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
      }

      setIsLoading(false);
    };

    initialize();

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName },
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
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
      telegramAuthError,
      signUp,
      signIn,
      signOut,
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
