import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MessageCircle, UserCheck, UserX, Send, Plus, ShieldAlert, AlertCircle, Lock, CheckCircle2, Trash2 } from 'lucide-react';
import axios from 'axios';
import { getWebSocketUrl } from '../lib/websocket';

interface DMRequest {
  id: string;
  sender_id: string;
  sender_name: string;
  receiver_id: string;
  receiver_name: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  created_at: string;
}

interface DirectMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

interface DMContact {
  user_id: string;
  name: string;
  student_code: string;
  department: string;
}

const DirectMessagesView: React.FC = () => {
  const { user, token, refreshProfile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<DMRequest[]>([]);
  const [contacts, setContacts] = useState<DMContact[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(() => localStorage.getItem('active_dm_target_id'));
  const [selectedTargetName, setSelectedTargetName] = useState<string>(() => localStorage.getItem('active_dm_target_name') || '');
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [input, setInput] = useState('');
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [blockedMessageWarning, setBlockedMessageWarning] = useState<{ message: string; remainingWarnings: number } | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [targetUserIdInput, setTargetUserIdInput] = useState('');
  const [requestStatusMsg, setRequestStatusMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';

  // 1. Fetch Pending Requests & Accepted DM Contacts
  const fetchData = async () => {
    const activeToken = token || localStorage.getItem('beacon_token');
    if (!activeToken) return;

    try {
      const [reqRes, contactRes] = await Promise.all([
        axios.get(`${baseUrl}/dms/requests`, { headers: { Authorization: `Bearer ${activeToken}` } }),
        axios.get(`${baseUrl}/dms/contacts`, { headers: { Authorization: `Bearer ${activeToken}` } })
      ]);

      setRequests(reqRes.data);
      const fetchedContacts: DMContact[] = contactRes.data;
      setContacts(fetchedContacts);

      // Validate selected target belongs to current user's contacts
      const storedTargetId = localStorage.getItem('active_dm_target_id');
      const targetIdToVerify = selectedTargetId || storedTargetId;

      if (targetIdToVerify && !location.state) {
        const matching = fetchedContacts.find(c => c.user_id === targetIdToVerify);
        if (matching) {
          selectConversation(matching.user_id, matching.name);
        } else if (fetchedContacts.length > 0) {
          selectConversation(fetchedContacts[0].user_id, fetchedContacts[0].name);
        } else {
          setSelectedTargetId(null);
          setSelectedTargetName('');
          localStorage.removeItem('active_dm_target_id');
          localStorage.removeItem('active_dm_target_name');
        }
      } else if (!selectedTargetId && fetchedContacts.length > 0 && !location.state) {
        selectConversation(fetchedContacts[0].user_id, fetchedContacts[0].name);
      }
    } catch (err) {
      console.error("Failed to fetch DM data", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const selectConversation = (id: string, name: string) => {
    setError(null);
    setSelectedTargetId(id);
    setSelectedTargetName(name);
    localStorage.setItem('active_dm_target_id', id);
    localStorage.setItem('active_dm_target_name', name);
  };

  // Handle incoming navigation state (e.g. from Senior Mentor "Request Guidance")
  useEffect(() => {
    const state = location.state as { targetEmail?: string; targetName?: string; targetId?: string } | null;
    if (!state) return;

    const targetIdentifier = state.targetEmail || state.targetId;
    if (!targetIdentifier) return;

    const connectToTarget = async () => {
      const activeToken = token || localStorage.getItem('beacon_token');
      if (!activeToken) return;

      try {
        const response = await axios.post(
          `${baseUrl}/dms/connect/${encodeURIComponent(targetIdentifier)}`,
          {},
          { headers: { Authorization: `Bearer ${activeToken}` } }
        );

        if (response.data && response.data.user_id) {
          selectConversation(response.data.user_id, response.data.name);
          await fetchData();
        }
      } catch (err) {
        console.error("Failed to auto-connect DM target:", err);
        if (state.targetId && state.targetName) {
          selectConversation(state.targetId, state.targetName);
        }
      } finally {
        navigate(location.pathname, { replace: true, state: null });
      }
    };

    connectToTarget();
  }, [location.state, token]);


  // 2. Fetch Chat History when conversation target is selected
  useEffect(() => {
    const activeToken = token || localStorage.getItem('beacon_token');
    if (!activeToken || !selectedTargetId) return;

    const fetchHistory = async () => {
      try {
        const response = await axios.get(`${baseUrl}/dms/history/${selectedTargetId}`, {
          headers: { Authorization: `Bearer ${activeToken}` }
        });
        setMessages(response.data);
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.detail || "Could not load DM history. Connection lock active.");
      }
    };

    fetchHistory();
  }, [selectedTargetId, token]);

  // 3. Connect Live 1-on-1 WebSocket when target is selected
  useEffect(() => {
    const activeToken = token || localStorage.getItem('beacon_token');
    if (!activeToken || !selectedTargetId) return;

    const wsUrl = getWebSocketUrl(`/dms/ws/${selectedTargetId}?token=${activeToken}`);
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      setError(null);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'DIRECT_MESSAGE' || data.type === 'MESSAGE') {
          // Only append message to screen if it matches the current conversation view
          const isFromSelectedTarget = data.sender_id === selectedTargetId;
          const isToSelectedTarget = data.sender_id === user?.id && data.receiver_id === selectedTargetId;

          if (isFromSelectedTarget || isToSelectedTarget) {
            const newMsg: DirectMessage = {
              id: data.id || `dm-${Date.now()}`,
              sender_id: data.sender_id,
              sender_name: data.sender_name || 'User',
              receiver_id: data.receiver_id || selectedTargetId,
              content: data.content,
              created_at: data.created_at || new Date().toISOString()
            };

            setMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          } else {
            // Received a message from a different user, refresh contacts/requests list
            fetchData();
          }
        } else if (data.type === 'ERROR') {
          setError(data.message);
          if (data.message && data.message.includes("Message blocked")) {
            setBlockedMessageWarning({
              message: data.message,
              remainingWarnings: data.remaining_warnings !== undefined ? data.remaining_warnings : 20
            });
            setTimeout(() => {
              setBlockedMessageWarning(null);
            }, 8000);
          }
        } else if (data.type === 'ACCOUNT_STATUS_UPDATE') {
          setError(data.message);
          refreshProfile();
        }
      } catch (err) {
        console.error("WS Parse error", err);
      }
    };

    socket.onerror = () => {
      setError("WebSocket connection error. Make sure the backend is running.");
    };

    socket.onclose = (event) => {
      if (event.code === 1008) {
        setError(event.reason || "DM connection closed due to policy violation or permanent block.");
      }
    };

    setWs(socket);

    return () => {
      socket.close();
    };
  }, [selectedTargetId, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handshake Actions
  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeToken = token || localStorage.getItem('beacon_token');
    if (!targetUserIdInput.trim() || !activeToken) return;
    setLoading(true);
    setRequestStatusMsg(null);

    try {
      await axios.post(`${baseUrl}/dms/request/${targetUserIdInput.trim()}`, {}, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      setRequestStatusMsg("DM Handshake Request sent successfully!");
      setTargetUserIdInput('');
      fetchData();
    } catch (err: any) {
      setRequestStatusMsg(`Failed: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (requestId: string, senderId: string, senderName: string) => {
    const activeToken = token || localStorage.getItem('beacon_token');
    if (!activeToken) return;
    try {
      await axios.post(`${baseUrl}/dms/accept/${requestId}`, {}, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      await fetchData();
      selectConversation(senderId, senderName);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to accept request.");
    }
  };

  const handleReject = async (requestId: string) => {
    const activeToken = token || localStorage.getItem('beacon_token');
    if (!activeToken) return;
    try {
      await axios.post(`${baseUrl}/dms/reject/${requestId}`, {}, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to reject request.");
    }
  };

  const handleDeleteChat = async (targetId: string) => {
    if (!window.confirm("Are you sure you want to delete this chat? This will erase all message history and disconnect the DM connection permanently.")) {
      return;
    }

    const activeToken = token || localStorage.getItem('beacon_token');
    if (!activeToken) return;

    try {
      await axios.delete(`${baseUrl}/dms/chat/${targetId}`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      setSelectedTargetId(null);
      setSelectedTargetName('');
      localStorage.removeItem('active_dm_target_id');
      localStorage.removeItem('active_dm_target_name');
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to delete chat.");
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !ws || !selectedTargetId) return;
    ws.send(JSON.stringify({ content: input.trim() }));
    setInput('');
  };

  return (
    <div className="flex h-full bg-slate-50 relative overflow-hidden">
      {/* Sidebar / Conversation List */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h1 className="font-bold text-slate-900 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-indigo-600" />
            Direct Messages
          </h1>
          <button
            onClick={() => setShowNewModal(true)}
            className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors cursor-pointer"
            title="New DM Request"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Pending Requests Section */}
        {requests.length > 0 && (
          <div className="p-4 bg-amber-50/50 border-b border-amber-100">
            <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              Pending DM Requests ({requests.length})
            </h3>
            <div className="space-y-2">
              {requests.map((req) => (
                <div key={req.id} className="bg-white p-3 rounded-xl border border-amber-200/60 shadow-xs flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-800">{req.sender_name}</span>
                    <span className="text-[10px] text-slate-400">wants to connect</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleAccept(req.id, req.sender_id, req.sender_name)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-1.5 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5" /> Accept
                    </button>
                    <button
                      onClick={() => handleReject(req.id)}
                      className="flex-1 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 text-xs font-bold py-1.5 rounded-lg flex items-center justify-center gap-1 transition-colors border border-slate-200 cursor-pointer"
                    >
                      <UserX className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Chats List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Active Conversations</p>
          
          {contacts.filter(c => c.user_id !== user?.id).length === 0 && (
            <div className="text-center py-8 text-slate-400 text-xs px-4">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
              No active conversations yet. Click "+" above to request a DM handshake with a classmate!
            </div>
          )}

          {contacts.filter(c => c.user_id !== user?.id).map((contact) => {
            const isSelected = selectedTargetId === contact.user_id;
            return (
              <div
                key={contact.user_id}
                onClick={() => selectConversation(contact.user_id, contact.name)}
                className={`p-3 rounded-2xl cursor-pointer flex items-center space-x-3 transition-all border ${
                  isSelected
                    ? 'bg-indigo-50 border-indigo-200 shadow-xs'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className={`w-9 h-9 rounded-full font-bold text-xs flex items-center justify-center shrink-0 ${
                  isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-indigo-400'
                }`}>
                  {contact.name.charAt(0) || 'U'}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-xs font-bold text-slate-900 truncate">{contact.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{contact.department}</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main DM Chat Area */}
      <div className="flex-1 flex flex-col bg-slate-50 relative">
        {selectedTargetId ? (
          <>
            {/* Header */}
            <div className="bg-white border-b border-slate-200 p-4 px-6 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center">
                  {selectedTargetName.charAt(0) || 'U'}
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-sm">{selectedTargetName}</h2>
                  <p className="text-[11px] text-green-600 font-semibold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    Handshake Connected • Live 1-on-1 Direct Chat
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleDeleteChat(selectedTargetId)}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 text-xs font-bold border border-transparent hover:border-red-200"
                title="Delete Chat History & Disconnect"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Delete Chat</span>
              </button>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 m-4 rounded-r-xl flex items-start space-x-3 text-red-700 text-xs shadow-md">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                <div>
                  <p className="font-bold">DM Connection Lock</p>
                  <p className="text-xs mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {/* Floating Profanity Warning Toast */}
            {blockedMessageWarning && (
              <div className="absolute bottom-20 right-6 z-50 max-w-sm bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl shadow-xl flex items-start gap-3 animate-in slide-in-from-bottom-4 duration-300">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider">Moderation Block</h4>
                  <p className="text-xs text-amber-755 mt-1 leading-relaxed">
                    {blockedMessageWarning.message}
                  </p>
                  <p className="text-xs font-bold text-amber-900 mt-2 bg-amber-100/60 inline-block px-2.5 py-1 rounded-md">
                    Warning threshold: {blockedMessageWarning.remainingWarnings} warning(s) left before your account is MUTED.
                  </p>
                </div>
                <button 
                  onClick={() => setBlockedMessageWarning(null)} 
                  className="text-amber-405 hover:text-amber-700 font-bold shrink-0 text-sm ml-2"
                >
                  ×
                </button>
              </div>
            )}

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3.5">
              {messages.length === 0 && !error && (
                <div className="text-center py-12 text-slate-400 text-xs">
                  <CheckCircle2 className="w-8 h-8 text-indigo-500 mx-auto mb-2 opacity-60" />
                  Handshake connection established! Send your first direct message to {selectedTargetName}.
                </div>
              )}

              {messages.map((msg, idx) => {
                const isMe = msg.sender_id === user?.id;
                return (
                  <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] p-3 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                      isMe 
                        ? 'bg-indigo-600 text-white rounded-tr-none font-medium' 
                        : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none font-normal'
                    }`}>
                      <p>{msg.content}</p>
                      <span className={`text-[9px] block mt-1 ${isMe ? 'text-indigo-200 text-right' : 'text-slate-400'}`}>
                        {(() => {
                          if (!msg.created_at) return '';
                          let isoStr = msg.created_at.includes(' ') ? msg.created_at.replace(' ', 'T') : msg.created_at;
                          const hasTimezone = isoStr.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(isoStr);
                          const cleanStr = hasTimezone ? isoStr : `${isoStr}Z`;
                          return new Date(cleanStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        })()}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            {user?.account_status === 'MUTED' || user?.account_status === 'BANNED' ? (
              <div className="p-4 bg-white border-t border-slate-200 shrink-0 flex flex-col gap-2 items-center">
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl text-xs font-semibold w-full justify-center shadow-xs">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  Messaging privileges restricted due to moderation policy.
                </div>
                <div className="flex w-full items-center space-x-3 opacity-50">
                  <input
                    type="text"
                    disabled={true}
                    placeholder="Messaging privileges restricted due to moderation policy."
                    className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none cursor-not-allowed"
                  />
                  <button
                    disabled={true}
                    className="p-2.5 bg-indigo-600 text-white rounded-xl cursor-not-allowed shadow-md"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-200 shrink-0 flex items-center space-x-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Type message to ${selectedTargetName}...`}
                  className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || !ws}
                  className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
            <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-4 shadow-sm">
              <MessageCircle className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-slate-800 text-base mb-1">Direct Messaging Hub</h3>
            <p className="text-xs text-slate-500 text-center max-w-sm">
              Select an active conversation on the left, or click "+" to initiate a DM handshake with a classmate by Student Code or Email!
            </p>
          </div>
        )}
      </div>

      {/* NEW DM REQUEST MODAL */}
      {showNewModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-md border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Lock className="w-4 h-4 text-indigo-600" />
                Initiate DM Handshake Request
              </h3>
              <button
                onClick={() => {
                  setShowNewModal(false);
                  setRequestStatusMsg(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Close
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Enter the student's <b>Beacon Code</b> (e.g. BCN-784A) or college email address to request a direct 1-on-1 messaging connection.
            </p>

            <form onSubmit={handleSendRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Student Identifier</label>
                <input
                  type="text"
                  required
                  value={targetUserIdInput}
                  onChange={(e) => setTargetUserIdInput(e.target.value)}
                  placeholder="e.g. BCN-784A2B or student@saranathan.ac.in"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {requestStatusMsg && (
                <div className={`p-3 rounded-xl text-xs font-medium ${
                  requestStatusMsg.startsWith('Failed') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
                }`}>
                  {requestStatusMsg}
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Sending Request...' : 'Send Handshake Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DirectMessagesView;
