import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '../api/client';

export interface UserInfo {
  id: number;
  username: string;
  is_admin: boolean;
  is_premium: boolean;
  trial_active: boolean;
  trial_ends_at: string | null;
}

interface UserContextType {
  user: UserInfo | null;
  loading: boolean;
  login: (u: string, p: string) => Promise<{ success: boolean; error?: string }>;
  register: (u: string, p: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

export const UserContext = createContext<UserContextType | null>(null);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const res = await apiFetch<{ user: UserInfo }>('/auth/me');
      setUser(res.user);
    } catch (e) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const res = await apiFetch<{ user: UserInfo }>('/auth/login', {
        method: 'POST',
        body: { username, password }
      });
      setUser(res.user);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.response?.data?.error || "Error al iniciar sesión" };
    }
  };

  const register = async (username: string, password: string) => {
    try {
      const res = await apiFetch<{ user: UserInfo }>('/auth/register', {
        method: 'POST',
        body: { username, password }
      });
      setUser(res.user);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.response?.data?.error || "Error al registrar" };
    }
  };

  const logout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
    }
  };

  return (
    <UserContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
};
