import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Trophy, Star, Target, Zap, MessageSquare, Calendar, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DashboardView: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Gamification Metrics Logic
  const currentXP = user?.current_xp || 0;
  const nextLevelXP = 1000;
  const progressPercent = Math.min((currentXP / nextLevelXP) * 100, 100);

  const quickActions = [
    {
      title: "Upload Timetable",
      desc: "Use AI Vision Parser to organize your weekly class schedule.",
      icon: Calendar,
      path: "/timetable",
      color: "bg-blue-100 text-blue-600"
    },
    {
      title: "Department Chat",
      desc: `Connect with ${user?.department || 'your department'} students instantly.`,
      icon: MessageSquare,
      path: "/chats",
      color: "bg-indigo-100 text-indigo-600"
    },
    {
      title: "View Achievements",
      desc: "Explore alumni success stories and campus recognition walls.",
      icon: Trophy,
      path: "/achievements",
      color: "bg-purple-100 text-purple-600"
    }
  ];

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* Welcome Banner */}
      <div className="bg-slate-900 rounded-3xl p-8 shadow-xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>
        
        <div className="relative z-10">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Welcome back, <span className="text-primary-400">{user?.name.split(' ')[0]}</span>!
          </h1>
          <p className="mt-2 text-slate-300 max-w-lg text-sm leading-relaxed">
            Stay on top of your classes, explore campus, and connect with your <strong className="text-indigo-300">{user?.department}</strong> department peers.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full text-xs font-bold">
              Dept: {user?.department}
            </span>
            <span className="bg-slate-800 text-slate-300 border border-slate-700 px-3 py-1 rounded-full text-xs font-mono">
              DM Code: {user?.student_code}
            </span>
          </div>
        </div>
      </div>

      {/* Gamification Panel: XP Tracker */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
        <div className="flex justify-between items-end mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Beacon Progress</h2>
              <p className="text-sm text-slate-500">Earn XP by participating in campus events.</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-3xl font-black text-slate-900">{currentXP}</span>
            <span className="text-slate-500 font-medium"> / {nextLevelXP} XP</span>
          </div>
        </div>
        
        <div className="w-full bg-slate-100 rounded-full h-4 mb-2 overflow-hidden border border-slate-200">
          <div 
            className="bg-gradient-to-r from-primary-500 to-indigo-500 h-4 rounded-full transition-all duration-1000 ease-out relative"
            style={{ width: `${progressPercent}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
          </div>
        </div>
        <p className="text-xs font-semibold text-primary-600 text-right">{1000 - currentXP} XP to Level 2!</p>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {quickActions.map((action, i) => (
          <div 
            key={i} 
            onClick={() => navigate(action.path)}
            className="bg-white p-6 rounded-3xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${action.color} group-hover:scale-110 transition-transform shadow-sm`}>
                <action.icon className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg group-hover:text-indigo-600 transition-colors">{action.title}</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{action.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardView;
