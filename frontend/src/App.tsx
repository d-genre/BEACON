import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AuthGuard from './components/layout/AuthGuard';
import SidebarNavigation from './components/layout/SidebarNavigation';
import { Menu, X } from 'lucide-react';

// Feature Views
import LoginView from './views/LoginView';
import RegisterView from './views/RegisterView';
import ForgotPasswordView from './views/ForgotPasswordView';
import DashboardView from './views/DashboardView';
import TimetableView from './views/TimetableView';
import MapsView from './views/MapsView';
import AchievementsView from './views/AchievementsView';
import DepartmentChatsView from './views/DepartmentChatsView';
import FacultyView from './views/FacultyView';
import SeniorMentorView from './views/SeniorMentorView';
import DirectMessagesView from './views/DirectMessagesView';
import ProfileView from './views/ProfileView';
import ClubsHubView from './views/ClubsHubView';
import CongruenceView from './views/CongruenceView';
import FloatingAIMentor from './components/ai/FloatingAIMentor';



const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 flex-col md:flex-row">
      {/* Mobile Top Header Bar */}
      <div className="flex items-center justify-between px-4 h-16 bg-slate-900 text-white md:hidden border-b border-slate-800 shrink-0">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 -ml-2 text-slate-400 hover:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white transition-colors cursor-pointer"
            aria-label="Open sidebar"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="text-lg font-black tracking-tight">
            <span className="text-primary-500">B</span>EACON
          </span>
        </div>
      </div>

      {/* Desktop Sidebar Navigation */}
      <SidebarNavigation className="hidden md:flex w-64 shrink-0" />

      {/* Mobile Drawer Overlay and Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer content sliding panel */}
          <div className="relative flex w-full max-w-xs flex-1 flex-col bg-slate-900 pt-5 pb-4 shadow-2xl transition-transform duration-300 ease-in-out">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white bg-slate-800/80 text-white hover:bg-slate-700 transition-colors cursor-pointer"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span className="sr-only">Close sidebar</span>
                <X className="h-6 h-6" aria-hidden="true" />
              </button>
            </div>

            {/* Mobile Sidebar Navigation */}
            <div className="h-full overflow-y-auto">
              <SidebarNavigation 
                className="flex flex-col h-full w-full bg-slate-900 text-slate-300 shadow-none" 
                onClose={() => setIsMobileMenuOpen(false)} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative min-w-0">
        {children}
      </main>

      {/* Floating AI Widget globally accessible inside layout */}
      <FloatingAIMentor />
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Routes */}
          <Route path="/login" element={<LoginView />} />
          <Route path="/register" element={<RegisterView />} />
          <Route path="/forgot-password" element={<ForgotPasswordView />} />

          {/* Protected Routes guarded by AuthGuard and wrapped in AppLayout */}
          <Route
            element={
              <AuthGuard />
            }
          >
            <Route
              path="*"
              element={
                <AppLayout>
                  <Routes>
                    <Route path="/" element={<DashboardView />} />
                    <Route path="/profile" element={<ProfileView />} />
                    <Route path="/settings" element={<ProfileView />} />
                    <Route path="/senior-mentor" element={<SeniorMentorView />} />
                    <Route path="/dms" element={<DirectMessagesView />} />
                    <Route path="/timetable" element={<TimetableView />} />
                    <Route path="/maps" element={<MapsView />} />
                    <Route path="/achievements" element={<AchievementsView />} />
                    <Route path="/clubs" element={<ClubsHubView />} />
                    <Route path="/chats" element={<DepartmentChatsView />} />
                    <Route path="/faculty" element={<FacultyView />} />
                    <Route path="/congruence" element={<CongruenceView />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </AppLayout>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
