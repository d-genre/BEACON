import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, Mail, Lock, ShieldCheck, AlertCircle, CheckCircle2, Loader2, ArrowLeft, MailCheck } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const ForgotPasswordView: React.FC = () => {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const navigate = useNavigate();

  // Listen for Supabase password recovery callback when user clicks the link in their email
  useEffect(() => {
    // Check if user came from password reset recovery email link
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setStep(2);
        setSuccessMsg("Email verification successful! Please set your new password below.");
        if (session?.user?.email) {
          setEmail(session.user.email);
        }
      }
    });

    // Also check current active session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && window.location.hash.includes('type=recovery')) {
        setStep(2);
        setSuccessMsg("Email verification successful! Please set your new password below.");
        if (session?.user?.email) {
          setEmail(session.user.email);
        }
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.endsWith('@saranathan.ac.in')) {
      setError("Access Denied: Only official Saranathan College emails (@saranathan.ac.in) are authorized.");
      return;
    }

    setLoading(true);

    try {
      // Send password reset verification email via Supabase Auth
      const { error: sbError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/forgot-password`,
      });

      if (sbError) {
        throw new Error(sbError.message);
      }

      setSuccessMsg(`📧 Password reset email sent to ${cleanEmail}! Please click the recovery link in your inbox.`);
    } catch (err: any) {
      setError(err.message || "Failed to send password reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please verify.");
      return;
    }

    setLoading(true);

    try {
      // Update password in Supabase Auth
      const { error: sbUpdateErr } = await supabase.auth.updateUser({ password: newPassword });
      if (sbUpdateErr) {
        throw new Error(sbUpdateErr.message);
      }

      setSuccessMsg("Password updated successfully! Redirecting to Sign In...");
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl text-white z-10 space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-600/30">
            {step === 1 ? <MailCheck className="w-6 h-6 text-white" /> : <KeyRound className="w-6 h-6 text-white" />}
          </div>
          <h1 className="text-2xl font-black tracking-tight">
            {step === 1 ? "Forgot Password?" : "Set New Password"}
          </h1>
          <p className="text-slate-300 text-xs mt-1">
            {step === 1 
              ? "Enter your Saranathan College email address to receive a verification reset link" 
              : `Email verified for ${email}. Enter your new password below.`}
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/20 border border-red-500/30 flex items-start space-x-2.5 text-red-200 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-green-500/20 border border-green-500/30 flex items-start space-x-2.5 text-green-200 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-green-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleSendResetEmail} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  College Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. john123@saranathan.ac.in"
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer text-xs"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending Verification Email...</span>
                  </>
                ) : (
                  <span>Send Password Reset Email</span>
                )}
              </button>
            </form>
        ) : (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer text-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Update Password</span>
                </>
              )}
            </button>
          </form>
        )}

        <div className="text-center pt-2 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
          <Link to="/login" className="text-slate-300 hover:text-white flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
          </Link>
          <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-bold underline">
            Register Account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordView;
