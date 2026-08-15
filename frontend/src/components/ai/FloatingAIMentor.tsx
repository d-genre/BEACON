import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User as UserIcon, Loader2, Sparkles } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

interface ChatLog {
  role: 'user' | 'model';
  content: string;
}

const FloatingAIMentor: React.FC = () => {
  const { user, token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatLog[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const [btnPosition, setBtnPosition] = useState<{ x: number; y: number } | null>(null);
  const [isBtnDragging, setIsBtnDragging] = useState(false);
  const btnDragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragDistance = useRef<number>(0);

  // Initialize button position to bottom-right of screen
  useEffect(() => {
    if (!btnPosition && typeof window !== 'undefined') {
      setBtnPosition({
        x: window.innerWidth - 180, // roughly where bottom-6 right-6 is
        y: window.innerHeight - 80,
      });
    }
  }, [btnPosition]);

  // Adjust on screen resize
  useEffect(() => {
    const handleResize = () => {
      setBtnPosition(prev => {
        if (!prev) return null;
        const maxX = window.innerWidth - 180;
        const maxY = window.innerHeight - 80;
        return {
          x: Math.min(Math.max(10, prev.x), Math.max(10, maxX)),
          y: Math.min(Math.max(10, prev.y), Math.max(10, maxY)),
        };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleBtnMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('input') || target.closest('a')) return;

    setIsBtnDragging(true);
    dragDistance.current = 0;
    if (btnPosition) {
      btnDragStart.current = {
        x: e.clientX - btnPosition.x,
        y: e.clientY - btnPosition.y,
      };
    }
    e.preventDefault();
  };

  const handleBtnTouchStart = (e: React.TouchEvent<HTMLButtonElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('input') || target.closest('a')) return;

    setIsBtnDragging(true);
    dragDistance.current = 0;
    const touch = e.touches[0];
    if (btnPosition) {
      btnDragStart.current = {
        x: touch.clientX - btnPosition.x,
        y: touch.clientY - btnPosition.y,
      };
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isBtnDragging) return;
      let newX = e.clientX - btnDragStart.current.x;
      let newY = e.clientY - btnDragStart.current.y;

      const maxX = window.innerWidth - 160;
      const maxY = window.innerHeight - 60;

      newX = Math.max(10, Math.min(newX, maxX));
      newY = Math.max(10, Math.min(newY, maxY));

      if (btnPosition) {
        const dx = newX - btnPosition.x;
        const dy = newY - btnPosition.y;
        dragDistance.current += Math.sqrt(dx * dx + dy * dy);
      }

      setBtnPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsBtnDragging(false);
    };

    if (isBtnDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isBtnDragging, btnPosition]);

  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (!isBtnDragging) return;
      const touch = e.touches[0];
      let newX = touch.clientX - btnDragStart.current.x;
      let newY = touch.clientY - btnDragStart.current.y;

      const maxX = window.innerWidth - 160;
      const maxY = window.innerHeight - 60;

      newX = Math.max(10, Math.min(newX, maxX));
      newY = Math.max(10, Math.min(newY, maxY));

      if (btnPosition) {
        const dx = newX - btnPosition.x;
        const dy = newY - btnPosition.y;
        dragDistance.current += Math.sqrt(dx * dx + dy * dy);
      }

      setBtnPosition({ x: newX, y: newY });
    };

    const handleTouchEnd = () => {
      setIsBtnDragging(false);
    };

    if (isBtnDragging) {
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isBtnDragging, btnPosition]);

  const handleButtonClick = () => {
    if (dragDistance.current > 5) {
      return;
    }
    setIsOpen(true);
  };

  // Initialize position to bottom-right of screen
  useEffect(() => {
    if (!position && typeof window !== 'undefined') {
      setPosition({
        x: window.innerWidth - 410, // 390px width + 20px padding
        y: window.innerHeight - 570, // 550px height + 20px padding
      });
    }
  }, [position]);

  // Adjust on screen resize
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => {
        if (!prev) return null;
        const maxX = window.innerWidth - 410;
        const maxY = window.innerHeight - 570;
        return {
          x: Math.min(Math.max(10, prev.x), Math.max(10, maxX)),
          y: Math.min(Math.max(10, prev.y), Math.max(10, maxY)),
        };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Left click only
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('a')) return;

    setIsDragging(true);
    if (position) {
      dragStart.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    }
    e.preventDefault();
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('a')) return;

    setIsDragging(true);
    const touch = e.touches[0];
    if (position) {
      dragStart.current = {
        x: touch.clientX - position.x,
        y: touch.clientY - position.y,
      };
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      let newX = e.clientX - dragStart.current.x;
      let newY = e.clientY - dragStart.current.y;

      const maxX = window.innerWidth - 390 - 10;
      const maxY = window.innerHeight - 550 - 10;

      newX = Math.max(10, Math.min(newX, maxX));
      newY = Math.max(10, Math.min(newY, maxY));

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      const touch = e.touches[0];
      let newX = touch.clientX - dragStart.current.x;
      let newY = touch.clientY - dragStart.current.y;

      const maxX = window.innerWidth - 390 - 10;
      const maxY = window.innerHeight - 550 - 10;

      newX = Math.max(10, Math.min(newX, maxX));
      newY = Math.max(10, Math.min(newY, maxY));

      setPosition({ x: newX, y: newY });
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging]);

  // Set initial welcome greeting on mount / user change
  useEffect(() => {
    const firstName = user?.name?.split(' ')[0] || 'Junior';
    const dept = user?.department || 'Engineering';
    setMessages([
      { 
        role: 'model', 
        content: `Hi ${firstName}! 👋 I'm Beacon AI Senior Mentor for ${dept}.\n\nAsk me anything about coding, python, projects, SIH hackathons, exam strategies, or campus life!` 
      }
    ]);
  }, [user]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  const sendQuery = async (queryText: string) => {
    if (!queryText.trim() || isLoading) return;

    const userMsg: ChatLog = { role: 'user', content: queryText.trim() };
    const updatedHistory = [...messages, userMsg];

    setMessages(updatedHistory);
    setInput('');
    setIsLoading(true);

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
      const activeToken = token || localStorage.getItem('beacon_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (activeToken) {
        headers['Authorization'] = `Bearer ${activeToken}`;
      }

      const response = await axios.post(
        `${baseUrl}/chat/ai`,
        {
          message: userMsg.content,
          history: messages.slice(1).map(m => ({ role: m.role, content: m.content }))
        },
        { headers }
      );

      const reply = response.data?.reply || "I am here to guide you with any questions!";
      setMessages([...updatedHistory, { role: 'model', content: reply }]);
    } catch (err: any) {
      console.error("AI Mentor Chat Error:", err);
      setMessages([
        ...updatedHistory, 
        { role: 'model', content: "Hey! I'm here to help with your question. Feel free to ask about Python, coding projects, SIH hackathons, exam prep, or campus guidance!" }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendQuery(input);
  };

  const suggestionChips = [
    { label: "🐍 Python Guidance", query: "How do I learn Python and Data Structures?" },
    { label: "🚀 SIH Hackathon", query: "What is the criteria for SIH hackathon?" },
    { label: "📚 Exam Strategies", query: "How to calculate internal marks and prepare for exams?" },
    { label: "🏫 Campus Guide", query: "Where is the library and canteen located?" }
  ];

  return (
    <>
      {/* FLOATING ACTION BUTTON */}
      {!isOpen && (
        <button
          onClick={handleButtonClick}
          onMouseDown={handleBtnMouseDown}
          onTouchStart={handleBtnTouchStart}
          style={{
            left: btnPosition ? `${btnPosition.x}px` : 'auto',
            top: btnPosition ? `${btnPosition.y}px` : 'auto',
            bottom: btnPosition ? 'auto' : '24px',
            right: btnPosition ? 'auto' : '24px',
          }}
          className={`fixed px-4 py-3 rounded-full bg-slate-900 text-white shadow-2xl hover:bg-slate-800 hover:scale-105 transition-all z-50 flex items-center space-x-2.5 ring-4 ring-indigo-500/30 group border border-slate-700 select-none ${isBtnDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          title="Ask AI Senior Mentor"
        >
          <div className="relative">
            <Bot className="w-5 h-5 text-indigo-400 group-hover:rotate-12 transition-transform" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full ring-2 ring-slate-900 animate-pulse"></span>
          </div>
          <span className="font-bold text-xs tracking-tight text-white pr-1">Ask AI Senior</span>
        </button>
      )}

      {/* CHAT WIDGET MODAL */}
      {isOpen && (
        <div 
          style={{
            left: position && typeof window !== 'undefined' && window.innerWidth > 640 ? `${position.x}px` : 'auto',
            top: position && typeof window !== 'undefined' && window.innerWidth > 640 ? `${position.y}px` : 'auto',
            bottom: position && typeof window !== 'undefined' && window.innerWidth > 640 ? 'auto' : '24px',
            right: position && typeof window !== 'undefined' && window.innerWidth > 640 ? 'auto' : '16px',
          }}
          className={`fixed w-full sm:w-[390px] max-w-[calc(100vw-32px)] h-[550px] max-h-[85vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden z-50 border border-slate-200 ${isDragging ? 'shadow-indigo-500/10 cursor-grabbing' : 'animate-in slide-in-from-bottom-5'}`}
        >
          {/* Header */}
          <div 
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            className="bg-slate-900 text-white p-4 px-5 flex justify-between items-center shrink-0 cursor-grab select-none active:cursor-grabbing"
          >
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight flex items-center gap-1.5">
                  AI Senior Mentor
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">Saranathan College Peer Guidance</p>
              </div>
            </div>
            
            <button 
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Suggestions Chips */}
          <div className="bg-slate-100/80 px-3 py-2 border-b border-slate-200 flex gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
            {suggestionChips.map((chip, i) => (
              <button
                key={i}
                onClick={() => sendQuery(chip.query)}
                className="px-2.5 py-1 bg-white hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 border border-slate-200 rounded-full text-[10px] font-semibold text-slate-700 whitespace-nowrap transition-colors cursor-pointer shrink-0 shadow-2xs"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex items-start space-x-2 ${
                  msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-indigo-400'
                  }`}
                >
                  {msg.role === 'user' ? <UserIcon className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>

                <div
                  className={`max-w-[80%] p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap shadow-2xs ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-none font-medium'
                      : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none font-normal'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center space-x-2 text-slate-400 text-xs p-2">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                <span>AI Senior is typing...</span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-slate-200 shrink-0">
            <form onSubmit={handleFormSubmit} className="flex items-center space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about coding, python, exams, SIH..."
                className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-md shadow-indigo-600/30 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingAIMentor;
