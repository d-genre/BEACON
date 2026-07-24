import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../context/AuthContext';
import { UserPlus, Mail, Lock, User as UserIcon, Building, AlertCircle, CheckCircle2, Loader2, MailCheck, UserCheck, ShieldCheck, Award } from 'lucide-react';
import axios from 'axios';

const COLLEGE_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@saranathan\.ac\.in$/;

const DEPARTMENTS = [
  "Computer Science & Engineering",
  "Computer Science & Engineering (AI&ML)",
  "Computer Science & Business Systems",
  "Information Technology",
  "Electronics & Communication Engineering",
  "Electrical & Electronics Engineering",
  "Instrumentation & Control Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Artificial Intelligence & Data Science"
];

const RegisterView: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [selectedRole, setSelectedRole] = useState<UserRole>('STUDENT');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  const { fetchProfile } = useAuth();
  const navigate = useNavigate();

  // Dynamic validation for email regex requirement
  const isEmailValid = COLLEGE_EMAIL_REGEX.test(email.trim());

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isEmailValid) {
      setError("Email must follow the pattern: [letters][numbers]@saranathan.ac.in (e.g. john123@saranathan.ac.in)");
      return;
    }

    setLoading(true);

    try {
      // 1. Register user with Supabase Auth (Supabase sends verification email automatically)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            name: name.trim(),
            department: department,
            role: selectedRole
          }
        }
      });

      if (authError) {
        if (authError.message.includes("already registered") || authError.status === 400) {
          throw new Error("An account with this email already exists in Supabase. Please click 'Sign in' below to log in.");
        }
        throw new Error(authError.message);
      }

      const supabaseUserId = authData.user?.id;
      const sessionToken = authData.session?.access_token;

      // 2. Register profile in FastAPI backend database
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
      const registerPayload = {
        user_id: supabaseUserId,
        name: name.trim(),
        email: email.trim(),
        department: department,
        role: selectedRole
      };

      const headers: Record<string, string> = {};
      if (sessionToken) {
        headers['Authorization'] = `Bearer ${sessionToken}`;
      }

      try {
        await axios.post(`${baseUrl}/auth/register`, registerPayload, { headers });
      } catch (backendErr: any) {
        console.warn("Backend registration notice:", backendErr.response?.data || backendErr.message);
      }

      // 3. Check if email verification is required
      if (!sessionToken) {
        // Verification email sent by Supabase
        setVerificationSent(true);
      } else {
        // Auto-logged in if confirmation is disabled in Supabase dashboard
        const profile = await fetchProfile(sessionToken);
        if (!profile) {
          setError("Registered with Supabase, but could not connect to Beacon backend. Please make sure the backend is running!");
          return;
        }
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Registration failed. Please try again.');
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
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl text-white z-10 my-8">
        {verificationSent ? (
          <div className="text-center py-4 space-y-6">
            <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto text-green-400">
              <MailCheck className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Verification Email Sent!</h2>
              <p className="text-slate-300 text-sm mt-3 leading-relaxed">
                We've dispatched a confirmation link to <span className="font-semibold text-white">{email}</span>.
              </p>
              <p className="text-slate-400 text-xs mt-2">
                Please check your inbox, click the verification link, and then return to sign in to your Beacon portal.
              </p>
            </div>

            <button
              onClick={() => navigate('/login')}
              className="w-full bg-primary-600 hover:bg-primary-500 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-primary-600/30 transition-all cursor-pointer"
            >
              Proceed to Sign In
            </button>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-600/30">
                <UserPlus className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-black tracking-tight">Create Account</h1>
              <p className="text-slate-300 text-sm mt-2">Join Beacon — Saranathan College Fresher Portal</p>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/20 border border-red-500/30 flex items-start space-x-3 text-red-200 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              {/* ROLE SELECTOR TOGGLE */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Select Registration Role
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

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Full Name</label>
                <div className="relative">
                  <UserIcon className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">College Email</label>
                <div className="relative">
                  <Mail className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john123@saranathan.ac.in"
                    className={`w-full bg-slate-800/80 border rounded-xl pl-11 pr-10 py-3 text-sm text-white placeholder-slate-500 focus:outline-none transition-all ${
                      email ? (isEmailValid ? 'border-green-500/80 focus:ring-green-500' : 'border-red-500/80 focus:ring-red-500') : 'border-slate-700 focus:border-primary-500'
                    }`}
                  />
                  {email && (
                    <div className="absolute right-3.5 top-3.5">
                      {isEmailValid ? (
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-400" />
                      )}
                    </div>
                  )}
                </div>
                {email && !isEmailValid && (
                  <p className="text-xs text-red-400 mt-1">Must match pattern: [name][number]@saranathan.ac.in</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Department</label>
                <div className="relative">
                  <Building className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-11 pr-4 py-3 text-sm text-white appearance-none focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all cursor-pointer"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept} className="bg-slate-800 text-white">
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !isEmailValid}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 mt-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Registering...</span>
                  </>
                ) : (
                  <span>Register Profile</span>
                )}
              </button>
            </form>

            <div className="mt-6 text-center border-t border-white/10 pt-4">
              <p className="text-sm text-slate-400">
                Already registered?{' '}
                <Link to="/login" className="text-primary-400 font-semibold hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RegisterView;
