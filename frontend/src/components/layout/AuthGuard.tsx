import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AlertOctagon, Loader2 } from 'lucide-react';

const AuthGuard: React.FC = () => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 animate-spin text-primary-500 mb-4" />
        <p className="text-sm font-medium text-slate-400">Verifying college credentials...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="relative min-h-screen">
      {/* BANNED STATE OVERLAY MASK */}
      {user.account_status === 'BANNED' && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 backdrop-blur-sm pointer-events-none p-4 pt-16">
          <div className="pointer-events-auto w-full max-w-2xl rounded-lg border-l-4 border-red-500 bg-white p-6 shadow-2xl flex items-center space-x-4">
            <AlertOctagon className="h-10 w-10 text-red-500 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-bold text-slate-900">Communication Privileges Revoked</h2>
              <p className="mt-1 text-sm text-slate-600">
                Your account has been restricted due to multiple violations of the Beacon community guidelines.
                Interactive features such as department chats, direct messaging, and timetable uploads are currently grayed out and disabled.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* RENDER CHILDREN ROUTES */}
      <div className={user.account_status === 'BANNED' ? 'pointer-events-none grayscale opacity-60 transition-all duration-300' : ''}>
        <Outlet />
      </div>
    </div>
  );
};

export default AuthGuard;
