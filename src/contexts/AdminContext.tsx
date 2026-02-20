/**
 * AdminContext — caches the server-side has_role('admin') check so that
 * AdminRoute and useAdmin don't each fire a separate RPC call.
 * The result is fetched once per user session and shared across all consumers.
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface AdminContextType {
  isAdmin: boolean;
  isAdminLoading: boolean;
}

const AdminContext = createContext<AdminContextType>({ isAdmin: false, isAdminLoading: true });

export const AdminProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setIsAdminLoading(false);
      return;
    }

    let cancelled = false;
    setIsAdminLoading(true);

    supabase
      .rpc('has_role', { _user_id: user.id, _role: 'admin' })
      .then(({ data, error }) => {
        if (!cancelled) {
          setIsAdmin(!error && data === true);
          setIsAdminLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [user]);

  return (
    <AdminContext.Provider value={{ isAdmin, isAdminLoading }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdminContext = () => useContext(AdminContext);
