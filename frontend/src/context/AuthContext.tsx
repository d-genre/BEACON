import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { supabase } from '../lib/supabaseClient';

export type UserRole = 'STUDENT' | 'CLUB_ADMIN' | 'FACULTY_ADMIN';
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('beacon_token'));
  const [loading, setLoading] = useState<boolean>(true);

  const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';

  const fetchProfile = async (accessToken: string): Promise<User | null> => {
    try {
      const response = await axios.get(`${baseUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setUser(response.data);
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
      await fetchProfile(activeToken);
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
        await fetchProfile(session.access_token);
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
    <AuthContext.Provider value={{ user, token, loading, isAuthenticated: !!user && !!token, logout, fetchProfile, refreshProfile }}>
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
