import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User as UserIcon, Mail, Building, ShieldCheck, Zap, Save, CheckCircle2, AlertCircle, Loader2, Copy, Key, Lock, Settings, Trash2 } from 'lucide-react';
import axios from 'axios';

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

const ProfileView: React.FC = () => {
  const { user, token, refreshProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [department, setDepartment] = useState(user?.department || DEPARTMENTS[0]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Admin Award XP states
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [awardAmount, setAwardAmount] = useState<number>(50);
  const [awardReason, setAwardReason] = useState<string>('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminSuccess, setAdminSuccess] = useState<string | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      const activeToken = token || localStorage.getItem('beacon_token');
      if (!activeToken || !user) return;
      if (user.role !== 'FACULTY_ADMIN' && user.role !== 'CLUB_ADMIN') return;
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
        const res = await axios.get(`${baseUrl}/auth/users`, {
          headers: { Authorization: `Bearer ${activeToken}` }
        });
        const students = res.data.filter((u: any) => u.role === 'STUDENT');
        setAllUsers(students);
        if (students.length > 0) {
          setSelectedStudentId(students[0].id);
        }
      } catch (err) {
        console.error("Failed to fetch users list for admin:", err);
      }
    };
    fetchUsers();
  }, [user, token]);

  const handleAwardXP = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);
    setAdminSuccess(null);
    if (!selectedStudentId) {
      setAdminError("Please select a student first.");
      return;
    }

    const activeToken = token || localStorage.getItem('beacon_token');
    if (!activeToken) return;

    setAdminLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
      const res = await axios.post(`${baseUrl}/auth/award-xp`, {
        student_id: selectedStudentId,
        amount: Number(awardAmount),
        reason: awardReason
      }, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      setAdminSuccess(res.data.message || `Successfully awarded ${awardAmount} XP!`);
      setAwardReason('');
      refreshProfile();
    } catch (err: any) {
      setAdminError(err.response?.data?.detail || "Failed to award XP. Try again.");
    } finally {
      setAdminLoading(false);
    }
  };
  const [copied, setCopied] = useState(false);

  // Change Password State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passLoading, setPassLoading] = useState(false);
  const [passSuccessMsg, setPassSuccessMsg] = useState<string | null>(null);
  const [passErrorMsg, setPassErrorMsg] = useState<string | null>(null);

  // Delete Account State
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { logout } = useAuth();

  const handleDeleteAccount = async () => {
    if (!token) return;
    setDeleteLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
      await axios.delete(`${baseUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await logout();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to delete account. Please try again.");
      setDeleteConfirm(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      setName(user.name);
      setDepartment(user.department);
    }
  }, [user]);

  const handleCopyCode = () => {
    if (user?.student_code) {
      navigator.clipboard.writeText(user.student_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
      await axios.put(
        `${baseUrl}/auth/me`,
        { name: name.trim(), department },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await refreshProfile();
      setSuccessMsg("Your profile details have been saved successfully!");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setPassErrorMsg(null);
    setPassSuccessMsg(null);

    if (newPassword.length < 6) {
      setPassErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassErrorMsg("Passwords do not match. Please verify.");
      return;
    }

    setPassLoading(true);

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
      await axios.post(`${baseUrl}/auth/reset_password`, {
        email: user.email,
        new_password: newPassword
      });

      setPassSuccessMsg("Account password updated successfully!");
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPassSuccessMsg(null), 4000);
    } catch (err: any) {
      setPassErrorMsg(err.response?.data?.detail || "Failed to update password.");
    } finally {
      setPassLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">
      <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Settings className="h-8 w-8 text-indigo-600" />
          Account Settings & Profile
        </h1>
        <p className="mt-2 text-slate-500">Manage your student profile, department affiliation, and account security settings.</p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-green-50 border border-green-200 text-green-700 font-semibold text-sm flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 font-semibold text-sm flex items-center gap-2 shadow-sm">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Main Profile Summary Card */}
      <div className="bg-slate-900 rounded-3xl p-8 shadow-xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600 rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
          <div className="w-24 h-24 rounded-3xl bg-indigo-600 text-white font-black text-3xl flex items-center justify-center shadow-2xl ring-4 ring-indigo-400/30 shrink-0">
            {user.name.charAt(0)}
          </div>

          <div className="space-y-2 text-center md:text-left flex-1">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <h2 className="text-2xl font-bold">{user.name}</h2>
              <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full">
                {user.role}
              </span>
              <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${
                user.account_status === 'ACTIVE' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                user.account_status === 'MUTED' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                'bg-red-500/20 text-red-300 border-red-500/30'
              }`}>
                {user.account_status}
              </span>
            </div>

            <p className="text-slate-300 text-sm">{user.department}</p>
            <p className="text-slate-400 text-xs flex items-center justify-center md:justify-start gap-1.5 pt-0.5">
              <Mail className="w-3.5 h-3.5" /> {user.email}
            </p>

            {/* Beacon Student Code Box */}
            <div className="pt-2 flex items-center justify-center md:justify-start">
              <div className="inline-flex items-center space-x-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-mono text-indigo-300">
                <Key className="w-3.5 h-3.5 text-indigo-400" />
                <span>DM Code: <strong className="text-white font-bold">{user.student_code}</strong></span>
                <button
                  onClick={handleCopyCode}
                  className="p-1 hover:text-white transition-colors text-slate-400 cursor-pointer"
                  title="Copy Student Code"
                >
                  {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* XP Metric Badge */}
          <div className="bg-slate-800/80 border border-slate-700/60 p-4 rounded-2xl text-center shrink-0 w-full md:w-auto">
            <div className="flex items-center justify-center space-x-1 text-amber-400 font-bold text-xs uppercase tracking-wider mb-1">
              <Zap className="w-4 h-4 fill-amber-400" /> Current XP
            </div>
            <p className="text-3xl font-black text-white">{user.current_xp}</p>
            <p className="text-[10px] text-slate-400 mt-1">Level 1 Student</p>
          </div>
        </div>
      </div>

      {/* Edit Profile Form */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-4">
          <UserIcon className="w-5 h-5 text-indigo-600" />
          Edit Personal Details
        </h3>

        <form onSubmit={handleUpdateProfile} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Full Name</label>
              <div className="relative">
                <UserIcon className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">College Email (Read-Only)</label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="email"
                  disabled
                  value={user.email}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Department</label>
            <div className="relative">
              <Building className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none"
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Profile Details</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* CHANGE PASSWORD & SECURITY SECTION */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-4">
          <Lock className="w-5 h-5 text-indigo-600" />
          Account Security & Password Change
        </h3>

        {passSuccessMsg && (
          <div className="p-3.5 rounded-xl bg-green-50 border border-green-200 text-green-700 font-semibold text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
            {passSuccessMsg}
          </div>
        )}

        {passErrorMsg && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 font-semibold text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            {passErrorMsg}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">New Password</label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Confirm New Password</label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={passLoading}
              className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              {passLoading ? (
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
          </div>
        </form>
      </div>

      {/* DELETE ACCOUNT DANGER ZONE */}
      <div className="bg-red-50/50 rounded-3xl p-8 border border-red-200 shadow-sm space-y-6">
        <h3 className="text-lg font-bold text-red-900 flex items-center gap-2 border-b border-red-100 pb-4">
          <Trash2 className="w-5 h-5 text-red-600" />
          Danger Zone
        </h3>
        
        <p className="text-xs text-red-700 font-medium leading-relaxed">
          Once you delete your account, there is no going back. All of your personal details, achievements, timetables, and messaging data will be permanently wiped from the campus database.
        </p>

        <div className="flex justify-start">
          {!deleteConfirm ? (
            <button
              type="button"
              onClick={() => setDeleteConfirm(true)}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-2 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete My Account & Data</span>
            </button>
          ) : (
            <div className="flex flex-col space-y-3">
              <p className="text-xs font-bold text-red-800 flex items-center gap-1.5 animate-pulse">
                <AlertCircle className="w-4 h-4" /> Are you absolutely sure you want to permanently delete your account?
              </p>
              <div className="flex space-x-3">
                <button
                  type="button"
                  disabled={deleteLoading}
                  onClick={handleDeleteAccount}
                  className="px-5 py-2.5 bg-red-700 hover:bg-red-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  {deleteLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>Yes, Delete Everything</span>
                </button>
                <button
                  type="button"
                  disabled={deleteLoading}
                  onClick={() => setDeleteConfirm(false)}
                  className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Admin Panel: Award XP */}
      {user && (user.role === 'FACULTY_ADMIN' || user.role === 'CLUB_ADMIN') && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Zap className="h-6 w-6 text-amber-500 fill-amber-400" />
              Admin Panel: Award Custom Student XP
            </h2>
            <p className="text-xs text-slate-500 mt-1">Select a student and distribute official academic/extracurricular activity points.</p>
          </div>

          {adminSuccess && (
            <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 font-semibold text-xs flex items-center gap-2 shadow-sm animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
              {adminSuccess}
            </div>
          )}

          {adminError && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 font-semibold text-xs flex items-center gap-2 shadow-sm animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              {adminError}
            </div>
          )}

          <form onSubmit={handleAwardXP} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Select Student</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {allUsers.length === 0 ? (
                    <option value="">No students registered yet</option>
                  ) : (
                    allUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email}) - {u.student_code}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">XP Amount</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={1000}
                  value={awardAmount}
                  onChange={(e) => setAwardAmount(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Reason / Contribution Description</label>
              <input
                type="text"
                required
                value={awardReason}
                onChange={(e) => setAwardReason(e.target.value)}
                placeholder="e.g. Won 1st place in Department Coding Contest"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={adminLoading || !selectedStudentId}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-5 rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 text-xs cursor-pointer disabled:opacity-50"
            >
              {adminLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Awarding Points...</span>
                </>
              ) : (
                <span>Award {awardAmount} XP</span>
              )}
            </button>
          </form>
        </div>
      )}
      </div>
    </div>
  );
};

export default ProfileView;
