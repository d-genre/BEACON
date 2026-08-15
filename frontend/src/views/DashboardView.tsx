import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Trophy, Zap, MessageSquare, Calendar, Sparkles, Bot, X, ChevronRight, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const DashboardView: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [tasks, setTasks] = useState<{
    timetable_uploaded: boolean;
    congruence_profile_setup: boolean;
    chat_messages_count: number;
    dm_connections_count: number;
  } | null>(null);

  useEffect(() => {
    const fetchTasks = async () => {
      const activeToken = token || localStorage.getItem('beacon_token');
      if (!activeToken) return;
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
        const res = await axios.get(`${baseUrl}/auth/tasks`, {
          headers: { Authorization: `Bearer ${activeToken}` }
        });
        setTasks(res.data);
      } catch (err) {
        console.error("Failed to fetch user tasks status:", err);
      }
    };
    if (user) {
      fetchTasks();
    }
  }, [user, token]);

  useEffect(() => {
    const hasSeen = localStorage.getItem('beacon_walkthrough_seen');
    if (!hasSeen && user) {
      setShowWalkthrough(true);
    }
  }, [user]);

  const handleCloseWalkthrough = () => {
    localStorage.setItem('beacon_walkthrough_seen', 'true');
    setShowWalkthrough(false);
  };

  const steps = [
    {
      title: "Welcome & XP Leveling System",
      description: "Track your academic journey! Earn Experience Points (XP) by engaging with mentors, registering for events, and participating in chats. Climb levels as you build your profile.",
      icon: Zap,
      iconColor: "text-amber-600 bg-amber-50",
    },
    {
      title: "RAG-Powered Congruence Matching",
      description: "Need team members for SIH or hackathons? Set up your Congruence profile with skills & portfolios, and search semantically to match the perfect candidates.",
      icon: Sparkles,
      iconColor: "text-indigo-600 bg-indigo-50",
    },
    {
      title: "Senior Mentor Hub",
      description: "Stuck on academic planning, placements, or projects? Connect 1-on-1 with registered 3rd and 4th-year seniors for guidance directly related to your department.",
      icon: Bot,
      iconColor: "text-emerald-600 bg-emerald-50",
    },
    {
      title: "Clubs & Dept Chatrooms",
      description: "Discover upcoming campus hackathons and register for club events in the Clubs Hub. Share thoughts and coordinate with peers instantly in live Department Chatrooms.",
      icon: MessageSquare,
      iconColor: "text-blue-600 bg-blue-50",
    },
    {
      title: "Secure Handshake DMs",
      description: "Direct messages require a mutual handshake request to unlock chat logs. Keep your conversations private, or choose 'Delete Chat' to erase histories permanently.",
      icon: Trophy,
      iconColor: "text-purple-600 bg-purple-50",
    }
  ];

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
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">
      <div className="max-w-6xl mx-auto space-y-8">
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

      {/* XP Quests & Tasks Checklist */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Beacon XP Quests & Tasks
          </h3>
          <p className="text-xs text-slate-500 mt-1">Complete activities across the platform to level up your score.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Quest 1 */}
          <div className={`p-4 rounded-2xl border transition-all ${tasks?.timetable_uploaded ? 'bg-green-50/40 border-green-200' : 'bg-slate-50/50 border-slate-200'}`}>
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  {tasks?.timetable_uploaded ? (
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  )}
                  Initialize Your Schedule
                </h4>
                <p className="text-[11px] text-slate-500 mt-1">Upload your timetable image or PDF to the AI Vision Parser.</p>
              </div>
              <span className="text-[11px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md shrink-0">+50 XP</span>
            </div>
            <div className="mt-3 flex justify-between items-center">
              <span className={`text-[10px] font-bold ${tasks?.timetable_uploaded ? 'text-green-600' : 'text-slate-500'}`}>
                {tasks?.timetable_uploaded ? '✓ Completed' : 'Pending'}
              </span>
              {!tasks?.timetable_uploaded && (
                <button onClick={() => navigate('/timetable')} className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer">
                  Go to Timetable →
                </button>
              )}
            </div>
          </div>

          {/* Quest 2 */}
          <div className={`p-4 rounded-2xl border transition-all ${tasks?.congruence_profile_setup ? 'bg-green-50/40 border-green-200' : 'bg-slate-50/50 border-slate-200'}`}>
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  {tasks?.congruence_profile_setup ? (
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  )}
                  Build Your Congruence Profile
                </h4>
                <p className="text-[11px] text-slate-500 mt-1">Submit your skills & portfolio to find matching team members.</p>
              </div>
              <span className="text-[11px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md shrink-0">+100 XP</span>
            </div>
            <div className="mt-3 flex justify-between items-center">
              <span className={`text-[10px] font-bold ${tasks?.congruence_profile_setup ? 'text-green-600' : 'text-slate-500'}`}>
                {tasks?.congruence_profile_setup ? '✓ Completed' : 'Pending'}
              </span>
              {!tasks?.congruence_profile_setup && (
                <button onClick={() => navigate('/congruence')} className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer">
                  Go to Congruence →
                </button>
              )}
            </div>
          </div>

          {/* Quest 3 */}
          <div className="p-4 rounded-2xl border bg-slate-50/50 border-slate-200 transition-all">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                  Engage in Department Chats
                </h4>
                <p className="text-[11px] text-slate-500 mt-1">Participate in live discussions with your department peers.</p>
              </div>
              <span className="text-[11px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md shrink-0">+5 XP / msg</span>
            </div>
            <div className="mt-3 flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-600">
                Messages sent: {tasks?.chat_messages_count || 0} ({((tasks?.chat_messages_count || 0) * 5)} XP earned)
              </span>
              <button onClick={() => navigate('/chats')} className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer">
                Open Chatroom →
              </button>
            </div>
          </div>

          {/* Quest 4 */}
          <div className="p-4 rounded-2xl border bg-slate-50/50 border-slate-200 transition-all">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                  DM Connections (Handshakes)
                </h4>
                <p className="text-[11px] text-slate-500 mt-1">Establish accepted 1-on-1 chats with mentors or peers.</p>
              </div>
              <span className="text-[11px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md shrink-0">Tracked</span>
            </div>
            <div className="mt-3 flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-600">
                Accepted DMs: {tasks?.dm_connections_count || 0}
              </span>
              <button onClick={() => navigate('/dms')} className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer">
                Open Messages →
              </button>
            </div>
          </div>
        </div>
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

      {/* Walkthrough Modal */}
      {showWalkthrough && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl p-6 relative overflow-hidden animate-in zoom-in-95 duration-200">
            <button
              onClick={handleCloseWalkthrough}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-6 pt-4">
              {/* Step content */}
              <div className="text-center space-y-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto ${steps[currentStep].iconColor} shadow-inner`}>
                  {React.createElement(steps[currentStep].icon, { className: "w-8 h-8" })}
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-extrabold text-slate-900">{steps[currentStep].title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                    {steps[currentStep].description}
                  </p>
                </div>
              </div>

              {/* Indicator dots */}
              <div className="flex justify-center space-x-1.5">
                {steps.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === currentStep ? 'w-6 bg-indigo-600' : 'w-1.5 bg-slate-200'
                    }`}
                  />
                ))}
              </div>

              {/* Navigation controls */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => currentStep > 0 && setCurrentStep(prev => prev - 1)}
                  disabled={currentStep === 0}
                  className="px-3 py-2 text-slate-500 hover:text-slate-700 disabled:opacity-30 text-xs font-bold transition-all cursor-pointer flex items-center space-x-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Prev</span>
                </button>

                {currentStep < steps.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(prev => prev + 1)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center space-x-1"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCloseWalkthrough}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md"
                  >
                    Get Started
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardView;
