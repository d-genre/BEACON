import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AuthGuard from './components/layout/AuthGuard';
import SidebarNavigation from './components/layout/SidebarNavigation';

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
import FloatingAIMentor from './components/ai/FloatingAIMentor';

// Placeholder for remaining views
const PlaceholderView = ({ title }: { title: string }) => <div className="p-8"><h1 className="text-3xl font-bold">{title}</h1></div>;

const AppLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="flex h-screen overflow-hidden bg-slate-50">
    <SidebarNavigation />
    <main className="flex-1 overflow-y-auto relative">
      {children}
    </main>
    {/* Floating AI Widget globally accessible inside layout */}
    <FloatingAIMentor />
  </div>
);

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
                    <Route path="/chats" element={<DepartmentChatsView />} />
                    <Route path="/faculty" element={<FacultyView />} />
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
