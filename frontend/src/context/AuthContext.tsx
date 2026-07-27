import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import axios from 'axios';
import { supabase } from '../lib/supabaseClient';

export type UserRole = 'STUDENT' | 'CLUB_ADMIN' | 'FACULTY_ADMIN' | 'SUPER_ADMIN';
export type UserAccountStatus = 'ACTIVE' | 'MUTED' | 'BANNED';

export interface User {
  id: string;
  student_code: string;
  name: string;
  email: string;
  department: string;
  role: UserRole;
  current_xp: number;
  account_status: UserAccountStatus;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
  fetchProfile: (accessToken: string) => Promise<User | null>;
  refreshProfile: () => Promise<void>;
  addXP: (amount: number, reason: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const cached = localStorage.getItem('beacon_user_cache');
    return cached ? JSON.parse(cached) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('beacon_token'));
  const [loading, setLoading] = useState<boolean>(true);

  const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';

  const fetchProfile = async (accessToken: string): Promise<User | null> => {
    try {
      const response = await axios.get(`${baseUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setUser(response.data);
      localStorage.setItem('beacon_user_cache', JSON.stringify(response.data));
      setToken(accessToken);
      localStorage.setItem('beacon_token', accessToken);
      return response.data;
    } catch (err: any) {
      console.error('Error fetching backend user profile:', err?.response?.data || err.message);
      setUser(null);
      setToken(null);
      localStorage.removeItem('beacon_token');
      throw err;
    }
  };

  const refreshProfile = async () => {
    const activeToken = token || localStorage.getItem('beacon_token');
    if (activeToken) {
      try {
        await fetchProfile(activeToken);
      } catch (err) {
        console.warn('Failed to refresh profile:', err);
      }
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const activeToken = session?.access_token || localStorage.getItem('beacon_token');

        if (activeToken) {
          setToken(activeToken);
          await fetchProfile(activeToken);
        } else {
          setUser(null);
          setToken(null);
        }
      } catch (err) {
        console.error('Failed to initialize auth:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.access_token) {
        setToken(session.access_token);
        try {
          await fetchProfile(session.access_token);
        } catch (err) {
          console.error("Failed to fetch profile on auth state change:", err);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setToken(null);
        localStorage.removeItem('beacon_token');
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const addXP = (amount: number, reason: string) => {
    if (!user) return;
    const updatedUser = { ...user, current_xp: user.current_xp + amount };
    setUser(updatedUser);
    localStorage.setItem('beacon_user_cache', JSON.stringify(updatedUser));
    
    // Attempt backend update if route exists, fail silently
    if (token) {
      axios.post(`${baseUrl}/auth/xp`, { amount, reason }, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
    }
    
    // Simple toast notification
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 bg-amber-500 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 z-50 animate-in slide-in-from-bottom-5 font-bold text-sm';
    toast.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg> +${amount} XP: ${reason}`;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('fade-out', 'opacity-0', 'transition-opacity', 'duration-500');
      setTimeout(() => toast.remove(), 500);
    }, 3000);
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.log("Supabase signout notice", e);
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem('beacon_token');
    localStorage.removeItem('active_dm_target_id');
    localStorage.removeItem('active_dm_target_name');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, isAuthenticated: !!user && !!token, logout, fetchProfile, refreshProfile, addXP }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
