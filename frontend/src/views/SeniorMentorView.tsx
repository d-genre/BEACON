import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Star, Award, MessageCircle, Search, Sparkles, Plus, CheckCircle2, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SeniorMentor {
  id: string;
  name: string;
  year: '2nd Year' | '3rd Year' | '4th Year';
  department: string;
  skills: string[];
  bio: string;
  rating: number;
  menteesCount: number;
  isAvailable: boolean;
  contactEmail: string;
}

const DEPARTMENTS = [
  "All Departments",
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

const YEARS = ["All Years", "2nd Year", "3rd Year", "4th Year"];

const SeniorMentorView: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mentors, setMentors] = useState<SeniorMentor[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('All Years');
  const [selectedDept, setSelectedDept] = useState('All Departments');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states for senior user to list themselves as mentor
  const [myYear, setMyYear] = useState<'2nd Year' | '3rd Year' | '4th Year'>('3rd Year');
  const [mySkills, setMySkills] = useState('');
  const [myBio, setMyBio] = useState('');

  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  const fetchMentors = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${baseUrl}/api/v1/mentors`);
      if (res.ok) {
        const data = await res.json();
        setMentors(data);
      } else {
        console.error("Failed to load senior mentors");
      }
    } catch (err) {
      console.error("Error fetching mentors:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMentors();
  }, []);

  const myMentorProfile = user ? mentors.find(m => m.contactEmail.toLowerCase() === user.email.toLowerCase() || m.id === user.id) : null;

  // Sync state when myMentorProfile loads or updates
  useEffect(() => {
    if (myMentorProfile) {
      setMyYear(myMentorProfile.year as any || '3rd Year');
      setMySkills(myMentorProfile.skills ? myMentorProfile.skills.join(', ') : '');
      setMyBio(myMentorProfile.bio || '');
    }
  }, [myMentorProfile]);

  const handleOpenModal = () => {
    if (myMentorProfile) {
      setMyYear(myMentorProfile.year as any || '3rd Year');
      setMySkills(myMentorProfile.skills ? myMentorProfile.skills.join(', ') : '');
      setMyBio(myMentorProfile.bio || '');
    }
    setErrorMsg(null);
    setShowRegisterModal(true);
  };

  const filteredMentors = mentors.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (m.skills && m.skills.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))) ||
                          m.bio.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesYear = selectedYear === 'All Years' || m.year === selectedYear;
    const matchesDept = selectedDept === 'All Departments' || m.department === selectedDept;
    return matchesSearch && matchesYear && matchesDept;
  });

  const handleRegisterAsMentor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    const payload = {
      name: user.name,
      year: myYear,
      department: user.department || 'Computer Science & Engineering',
      skills: mySkills.split(',').map(s => s.trim()).filter(Boolean),
      bio: myBio,
      rating: 5.0,
      contactEmail: user.email,
      isAvailable: true,
      user_id: user.id
    };

    try {
      const res = await fetch(`${baseUrl}/api/v1/mentors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const created = await res.json();
        const existingIndex = mentors.findIndex(m => m.contactEmail.toLowerCase() === user.email.toLowerCase() || m.id === user.id);
        if (existingIndex >= 0) {
          const updated = [...mentors];
          updated[existingIndex] = created;
          setMentors(updated);
        } else {
          setMentors([created, ...mentors]);
        }
        setShowRegisterModal(false);
        setSuccessMsg("Congratulations! Your Senior Mentor profile is active and highlighted on the board.");
        setTimeout(() => setSuccessMsg(null), 5000);
      } else {
        const errData = await res.json();
        setErrorMsg(errData.detail || "Failed to register mentor profile.");
      }
    } catch (err) {
      console.error("Error registering mentor:", err);
      setErrorMsg("Network error trying to register mentor profile.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAvailability = async (id: string) => {
    try {
      const res = await fetch(`${baseUrl}/api/v1/mentors/${id}/toggle_availability?user_id=${user?.id || ''}`, {
        method: 'PATCH'
      });
      if (res.ok) {
        const updatedMentor = await res.json();
        setMentors(prev => prev.map(m => m.id === id ? updatedMentor : m));
      }
    } catch (err) {
      console.error("Error toggling mentor availability:", err);
    }
  };

  const handleRequestGuidance = (mentor: SeniorMentor) => {
    navigate('/dms', {
      state: {
        targetEmail: mentor.contactEmail,
        targetName: mentor.name,
        targetId: mentor.id
      }
    });
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* Hero Banner */}
      <div className="bg-slate-900 rounded-3xl p-8 shadow-xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute -bottom-10 -left-10 w-80 h-80 bg-primary-600 rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="max-w-xl">
            <div className="inline-flex items-center space-x-2 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full text-xs font-bold mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Peer-to-Peer Student Guidance</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">
              Senior Mentor Hub
            </h1>
            <p className="mt-2 text-slate-300 text-sm leading-relaxed">
              Connect directly with experienced 2nd, 3rd, and 4th-year seniors for 1-on-1 academic advice, hackathon prep, and campus guidance.
            </p>
          </div>

          <button
            onClick={handleOpenModal}
            className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-2xl shadow-lg shadow-indigo-600/30 transition-all flex items-center space-x-2 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{myMentorProfile ? "Edit My Mentor Profile" : "Join as Senior Mentor"}</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-semibold flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          {successMsg}
        </div>
      )}

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by mentor name, skill (e.g. SIH, Python, DSA)..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex items-center space-x-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm cursor-pointer"
          >
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm cursor-pointer"
          >
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      {/* Loading Skeleton / Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(idx => (
            <div key={idx} className="rounded-3xl p-6 bg-white border border-slate-200 shadow-sm animate-pulse space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-200"></div>
                  <div className="space-y-1">
                    <div className="h-5 bg-slate-200 rounded w-32"></div>
                    <div className="h-3 bg-slate-200 rounded w-24"></div>
                  </div>
                </div>
                <div className="w-16 h-5 bg-slate-200 rounded-full"></div>
              </div>
              <div className="h-4 bg-slate-200 rounded w-full"></div>
              <div className="flex gap-2">
                <div className="w-16 h-6 bg-slate-200 rounded-lg"></div>
                <div className="w-20 h-6 bg-slate-200 rounded-lg"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredMentors.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200">
          <p className="text-slate-500 font-medium">No senior mentors found matching your filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredMentors.map((mentor) => {
            const isMe = user && (mentor.contactEmail.toLowerCase() === user.email.toLowerCase() || mentor.id === user.id);

            return (
              <div 
                key={mentor.id} 
                className={`rounded-3xl p-6 transition-all flex flex-col justify-between group relative overflow-hidden ${
                  isMe 
                    ? 'bg-gradient-to-br from-indigo-50/90 to-white border-2 border-indigo-500 shadow-md ring-4 ring-indigo-500/10' 
                    : 'bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 rounded-2xl font-black flex items-center justify-center text-lg shadow-md group-hover:scale-105 transition-transform ${
                        isMe ? 'bg-indigo-600 text-white ring-2 ring-indigo-300' : 'bg-slate-900 text-white'
                      }`}>
                        {mentor.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-bold text-slate-900 text-lg group-hover:text-indigo-600 transition-colors leading-tight">{mentor.name}</h3>
                          {isMe && (
                            <span className="bg-indigo-600 text-white text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full shadow-sm">
                              YOU (MY PROFILE)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{mentor.department}</p>
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${
                      mentor.year === '4th Year' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                      mentor.year === '3rd Year' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                      'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {mentor.year}
                    </span>
                  </div>

                  {/* Bio */}
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">{mentor.bio}</p>

                  {/* Skills Badges */}
                  <div className="flex flex-wrap gap-1.5 mb-6">
                    {mentor.skills && mentor.skills.map((skill, i) => (
                      <span key={i} className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border ${
                        isMe ? 'bg-indigo-100/80 text-indigo-800 border-indigo-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer Stats & Action Buttons */}
                <div className="pt-4 border-t border-slate-200/60 flex items-center justify-between">
                  <div className="flex items-center space-x-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1 font-bold text-amber-500">
                      <Star className="w-3.5 h-3.5 fill-amber-500" /> {mentor.rating}
                    </span>
                    <span>•</span>
                    <span>{mentor.menteesCount} Mentees</span>
                  </div>

                  {isMe ? (
                    <button
                      onClick={() => toggleAvailability(mentor.id)}
                      className={`px-3.5 py-1.5 text-xs font-bold rounded-xl shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer ${
                        mentor.isAvailable 
                          ? 'bg-green-600 hover:bg-green-700 text-white' 
                          : 'bg-slate-700 hover:bg-slate-800 text-white'
                      }`}
                    >
                      {mentor.isAvailable ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      <span>{mentor.isAvailable ? "Open for Mentees" : "Status: Busy"}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRequestGuidance(mentor)}
                      disabled={!mentor.isAvailable}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>{mentor.isAvailable ? "Request Guidance" : "Busy"}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* REGISTER AS SENIOR MENTOR MODAL */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-600" />
                {myMentorProfile ? "Edit Your Senior Mentor Profile" : "List Yourself as a Senior Mentor"}
              </h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Seniors in 2nd, 3rd, and 4th year can list their skills to guide freshers in academics, labs, and career goals.
            </p>

            {errorMsg && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleRegisterAsMentor} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Your Year of Study</label>
                <select
                  value={myYear}
                  onChange={(e) => setMyYear(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-700"
                >
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Specialization & Skills (Comma separated)</label>
                <input
                  type="text"
                  required
                  value={mySkills}
                  onChange={(e) => setMySkills(e.target.value)}
                  placeholder="e.g. SIH Winner, Full-Stack, C++ DSA, Placement Prep"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Short Mentor Guidance Bio</label>
                <textarea
                  required
                  rows={3}
                  value={myBio}
                  onChange={(e) => setMyBio(e.target.value)}
                  placeholder="Describe how you can help 1st-year juniors (e.g., sharing lab notes, hackathon guidance, GPA tips)..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 resize-none"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {myMentorProfile ? "Update My Profile" : "Submit Mentor Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeniorMentorView;
