import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Send, Users, AlertTriangle, Info, Copy, CheckCircle2 } from 'lucide-react';
import axios from 'axios';

interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  sender_name: string;
  sender_code?: string;
  content: string;
  created_at: string;
}

const DepartmentChatsView: React.FC = () => {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const departmentName = user?.department || 'General';

  // Fetch History
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
        const response = await axios.get(`${baseUrl}/chat/history/${encodeURIComponent(departmentName)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessages(response.data);
      } catch (err: any) {
        console.error('Failed to fetch chat history', err);
      }
    };

    if (token) {
      fetchHistory();
    }
  }, [departmentName, token]);

  // Connect WebSocket
  useEffect(() => {
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//127.0.0.1:8000/chat/ws/${encodeURIComponent(departmentName)}?token=${token}`;
    
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'MESSAGE') {
          setMessages(prev => [...prev, data]);
        } else if (data.type === 'ERROR') {
          setError(data.message);
        } else if (data.type === 'ACCOUNT_STATUS_UPDATE') {
          setError(data.message);
        }
      } catch (err) {
        console.error("Failed to parse WS message", err);
      }
    };

    socket.onclose = (event) => {
      setIsConnected(false);
      if (event.code === 1008) {
        setError(event.reason || "Connection rejected due to policy violation.");
      }
    };

    socket.onerror = () => {
      setIsConnected(false);
      setError("WebSocket connection error. Make sure the backend is running and the department room is seeded.");
    };

    setWs(socket);

    return () => {
      socket.close();
    };
  }, [departmentName, token]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !ws || !isConnected) return;
    
    setError(null);
    ws.send(JSON.stringify({ content: input.trim() }));
    setInput('');
  };

  const copyStudentCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  if (!user) return null;

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-4 px-6 flex items-center justify-between shrink-0 shadow-sm z-10 relative">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            {departmentName} Hub
          </h1>
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
            {isConnected ? 'Connected to live chat' : 'Disconnected'}
          </p>
        </div>
        <div className="hidden md:flex items-center space-x-2 text-xs font-semibold bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full border border-indigo-100">
          <Info className="w-4 h-4" />
          <span>Click any student's DM Code to copy & request DMs!</span>
        </div>
      </div>

      {/* Error / Toast Banner */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 flex items-start gap-3 absolute top-20 left-4 right-4 z-20 shadow-md rounded-r-lg">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 font-medium">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-700 font-bold">×</button>
        </div>
      )}

      {copiedCode && (
        <div className="bg-green-600 text-white text-xs font-bold py-2 px-4 rounded-xl fixed top-20 right-6 z-30 shadow-lg flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" />
          Copied DM Code: {copiedCode}
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        <div className="text-center mb-8">
          <div className="inline-block bg-slate-200 text-slate-600 text-xs px-3.5 py-1.5 rounded-full font-semibold">
            Welcome to the {departmentName} Chat Room
          </div>
        </div>

        {messages.map((msg, idx) => {
          const isMe = msg.sender_id === user.id;
          const showName = idx === 0 || messages[idx - 1].sender_id !== msg.sender_id;
          const studentCode = msg.sender_code || (isMe ? user.student_code : `BCN-${msg.sender_id.slice(0, 6).toUpperCase()}`);
          
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              {showName && (
                <div className={`flex items-center space-x-2 mb-1.5 ${isMe ? 'mr-1 flex-row-reverse space-x-reverse' : 'ml-1'}`}>
                  <span className="text-xs font-bold text-slate-800">{msg.sender_name}</span>
                  <button
                    onClick={() => copyStudentCode(studentCode)}
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border flex items-center space-x-1 transition-all cursor-pointer ${
                      isMe 
                        ? 'bg-indigo-100 text-indigo-700 border-indigo-300 hover:bg-indigo-200' 
                        : 'bg-slate-200 text-slate-700 border-slate-300 hover:bg-slate-300'
                    }`}
                    title="Click to Copy Student DM Code"
                  >
                    <span>{studentCode}</span>
                    <Copy className="w-3 h-3 opacity-60" />
                  </button>
                </div>
              )}
              <div 
                className={`max-w-[85%] md:max-w-[70%] p-3.5 rounded-2xl shadow-sm text-sm ${
                  isMe 
                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                    : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                }`}
              >
                {msg.content}
              </div>
              <span className={`text-[10px] text-slate-400 mt-1 ${isMe ? 'mr-1' : 'ml-1'}`}>
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-slate-200 p-4 shrink-0 z-10">
        <div className="max-w-4xl mx-auto">
          {user.account_status === 'MUTED' ? (
             <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-4 text-center text-sm font-medium flex items-center justify-center gap-2">
               <AlertTriangle className="w-5 h-5" />
               Your account is currently MUTED. You cannot send messages in department chats.
             </div>
          ) : (
            <form onSubmit={handleSend} className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                disabled={!isConnected || user.account_status === 'BANNED'}
                className="flex-1 bg-slate-100 border border-slate-200 rounded-full px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || !isConnected || user.account_status === 'BANNED'}
                className="bg-indigo-600 text-white p-3 rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <Send className="w-5 h-5 -ml-0.5" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default DepartmentChatsView;
