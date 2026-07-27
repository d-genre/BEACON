import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, MessageSquare, GraduationCap, Map, Trophy, LogOut, Bot, MessageCircle, Settings, Award, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

interface SidebarNavigationProps {
  onClose?: () => void;
  className?: string;
}

const SidebarNavigation: React.FC<SidebarNavigationProps> = ({ onClose, className }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'My Profile & Settings', path: '/profile', icon: Settings },
    { label: 'Senior Mentor Hub', path: '/senior-mentor', icon: Bot },
    { label: 'Direct Messages', path: '/dms', icon: MessageCircle },
    { label: 'Dept Chats', path: '/chats', icon: MessageSquare },
    { label: 'Timetable', path: '/timetable', icon: CalendarDays },
    { label: 'Campus Maps', path: '/maps', icon: Map },
    { label: 'Achievement Wall', path: '/achievements', icon: Trophy },
    { label: 'Clubs Hub', path: '/clubs', icon: Award },
    { label: 'Faculty Directory', path: '/faculty', icon: GraduationCap },
    { label: 'Congruence', path: '/congruence', icon: Sparkles },
  ];

  return (
    <div className={twMerge("w-64 bg-slate-900 text-slate-300 flex flex-col min-h-screen shadow-xl hidden md:flex", className)}>
      <div className="h-16 flex items-center px-6 border-b border-slate-800 shrink-0">
        <h1 className="text-xl font-black tracking-tight text-white">
          <span className="text-primary-500">B</span>EACON
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
        <div className="mb-4 px-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Navigation</p>
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onClose}
            className={({ isActive }) => clsx(
              "flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group",
              isActive 
                ? "bg-primary-500/10 text-primary-500 font-bold" 
                : "hover:bg-slate-800 hover:text-white"
            )}
          >
            <item.icon className="w-5 h-5 opacity-75 group-hover:opacity-100 transition-opacity" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>

      <div className="p-4 border-t border-slate-800 shrink-0">
        <div 
          onClick={() => {
            navigate('/profile');
            if (onClose) onClose();
          }}
          className="flex items-center space-x-3 px-2 py-3 bg-slate-800/50 hover:bg-slate-800 rounded-lg mb-4 cursor-pointer transition-colors group"
        >
          <div className="w-10 h-10 rounded-full bg-primary-600 group-hover:bg-primary-500 flex items-center justify-center text-white font-bold text-sm shadow-md transition-colors">
            {user?.name.charAt(0)}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-white truncate group-hover:text-primary-400 transition-colors">{user?.name}</p>
            <p className="text-xs text-indigo-400 font-semibold truncate">{user?.department}</p>
          </div>
        </div>
        
        <button 
          onClick={() => {
            logout();
            if (onClose) onClose();
          }}
          className="flex items-center w-full space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
        >
          <LogOut className="w-5 h-5" />
          <span>Log out</span>
        </button>
      </div>
    </div>
  );
};

export default SidebarNavigation;
