import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../context/AuthContext';
import { LogIn, Mail, Lock, AlertCircle, Loader2, UserCheck, ShieldCheck, Award } from 'lucide-react';
import axios from 'axios';

const LoginView: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('STUDENT');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { fetchProfile } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!email.trim().toLowerCase().endsWith("@saranathan.ac.in")) {
      setError("Access Denied: Only official Saranathan College emails (@saranathan.ac.in) are authorized.");
      setLoading(false);
      return;
    }

    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';

    try {
      // 1. Try Supabase Authentication
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (authError || !data.session?.access_token) {
        setError(authError?.message || "Authentication failed. Please verify your credentials.");
        setLoading(false);
        return;
      }

      // 2. Fetch profile from FastAPI backend using Supabase JWT token
      try {
        await fetchProfile(data.session.access_token);
      } catch (err: any) {
        if (err.response?.status === 404) {
          // Self-healing: if Supabase login is successful but backend profile is missing, auto-create it
          try {
            const userObj = data.user || data.session?.user;
            if (userObj) {
              const metadata = userObj.user_metadata || {};
              const registerPayload = {
                user_id: userObj.id,
                name: metadata.name || userObj.email?.split('@')[0].replace('.', ' ') || 'User',
                email: userObj.email,
                department: metadata.department || 'General',
                role: selectedRole
              };
              
              // Post to /auth/register on backend
              await axios.post(`${baseUrl}/auth/register`, registerPayload);
              
              // Retry fetching the profile
              await fetchProfile(data.session.access_token);
            } else {
              throw err;
            }
          } catch (registerErr: any) {
            console.error("Auto-registration fallback failed:", registerErr);
            setError("User profile not found in campus database. Please register your account.");
            setLoading(false);
            return;
          }
        } else {
          setError(err.response?.data?.detail || "Failed to fetch user profile from backend.");
          setLoading(false);
          return;
        }
      }

      // 3. Synchronize user role in database
      try {
        await axios.put(
          `${baseUrl}/auth/me`,
          { role: selectedRole },
          { headers: { Authorization: `Bearer ${data.session.access_token}` } }
        );
        await fetchProfile(data.session.access_token);
      } catch (syncErr) {
        console.warn("Failed to synchronize user role in DB:", syncErr);
      }

      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during sign in.");
    } finally {
      setLoading(false);
    }
  };

  const roleOptions: { id: UserRole; label: string; icon: any; color: string }[] = [
    { id: 'STUDENT', label: 'Student', icon: UserCheck, color: 'border-primary-500 bg-primary-500/10 text-primary-400' },
    { id: 'FACULTY_ADMIN', label: 'Faculty Admin', icon: ShieldCheck, color: 'border-indigo-500 bg-indigo-500/10 text-indigo-400' },
    { id: 'CLUB_ADMIN', label: 'Club Admin', icon: Award, color: 'border-amber-500 bg-amber-500/10 text-amber-400' }
  ];

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl text-white z-10 space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-primary-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-primary-600/30">
            <LogIn className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-black tracking-tight">Welcome Back</h1>
          <p className="text-slate-300 text-xs mt-1">Sign in with your Saranathan College account</p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/20 border border-red-500/30 flex items-start space-x-3 text-red-200 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* ROLE SELECTOR TOGGLE */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Select Sign In Role
          </label>
          <div className="grid grid-cols-3 gap-2">
            {roleOptions.map((role) => {
              const Icon = role.icon;
              const isSelected = selectedRole === role.id;
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRole(role.id)}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    isSelected 
                      ? role.color + ' ring-2 ring-white/30 shadow-md' 
                      : 'border-slate-700 bg-slate-800/40 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-[10px] text-center leading-tight">{role.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              College Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. john123@saranathan.ac.in"
                className="w-full bg-slate-800/60 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Password
              </label>
              <Link to="/forgot-password" className="text-[11px] font-semibold text-primary-400 hover:text-primary-300">
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-800/60 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-primary-600/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer text-xs"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              <span>Sign In as {selectedRole.replace('_', ' ')}</span>
            )}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-slate-800 text-xs text-slate-400">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary-400 hover:text-primary-300 font-bold underline">
            Register Here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
