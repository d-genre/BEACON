import React, { useState, useEffect } from 'react';
import { Search, Plus, X, Sparkles, Trophy, User as UserIcon, Loader2, Trash2, Pencil } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Achievement {
  id: string;
  title: string;
  category: 'Hackathons' | 'Research & Patents' | 'Placements' | 'University Ranks' | 'Sports & Culturals' | 'Institution';
  department: string;
  studentName: string;
  description: string;
  date: string;
  badgeColor: string;
}

const CATEGORIES = ["All", "Hackathons", "Research & Patents", "Placements", "University Ranks", "Sports & Culturals", "Institution"];

const AchievementsView: React.FC = () => {
  const { user, token } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>(() => {
    const cached = localStorage.getItem('beacon_achievements_cache');
    return cached ? JSON.parse(cached) : [];
  });
  const [isLoading, setIsLoading] = useState<boolean>(!localStorage.getItem('beacon_achievements_cache'));
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleDeleteAchievement = async (id: string) => {
    if (!token) return;
    if (!window.confirm("Are you sure you want to delete this achievement?")) return;
    try {
      const res = await fetch(`${baseUrl}/api/v1/achievements/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setAchievements(prev => prev.filter(item => item.id !== id));
      } else {
        alert("Failed to delete achievement.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error deleting achievement.");
    }
  };

  // New Achievement Form State
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<Achievement['category']>("Hackathons");
  const [newDept, setNewDept] = useState(user?.department || "Computer Science & Engineering");
  const [newStudentName, setNewStudentName] = useState(user?.name || "");
  const [newDesc, setNewDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Achievement Form State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState<Achievement['category']>("Hackathons");
  const [editDept, setEditDept] = useState("Computer Science & Engineering");
  const [editStudentName, setEditStudentName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editDate, setEditDate] = useState("");

  const handleOpenEditModal = (item: Achievement) => {
    setErrorMsg(null);
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditCategory(item.category);
    setEditDept(item.department);
    setEditStudentName(item.studentName);
    setEditDesc(item.description);
    setEditDate(item.date);
    setIsEditModalOpen(true);
  };

  const handleEditAchievement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim() || !editDesc.trim() || !editingId) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    const payload = {
      title: editTitle.trim(),
      category: editCategory,
      department: editDept,
      studentName: editStudentName.trim() || "Beacon Student",
      description: editDesc.trim(),
      date: editDate.trim() || new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-300"
    };

    try {
      const res = await fetch(`${baseUrl}/api/v1/achievements/${editingId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const updated = await res.json();
        setAchievements(prev => prev.map(item => item.id === editingId ? updated : item));
        setIsEditModalOpen(false);
      } else {
        const errData = await res.json();
        setErrorMsg(errData.detail || "Failed to update achievement.");
      }
    } catch (err) {
      console.error("Error editing achievement:", err);
      setErrorMsg("Network error trying to edit achievement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';


  const fetchAchievements = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${baseUrl}/api/v1/achievements`);
      if (res.ok) {
        const data = await res.json();
        setAchievements(data);
        localStorage.setItem('beacon_achievements_cache', JSON.stringify(data));
      } else {
        console.error("Failed to load achievements");
      }
    } catch (err) {
      console.error("Error fetching achievements:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAchievements();
  }, []);

  const handleAddAchievement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    const payload = {
      title: newTitle.trim(),
      category: newCategory,
      department: newDept,
      studentName: newStudentName.trim() || user?.name || "Beacon Student",
      description: newDesc.trim(),
      date: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-300",
      user_id: user?.id
    };

    try {
      const res = await fetch(`${baseUrl}/api/v1/achievements`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });


      if (res.ok) {
        const created = await res.json();
        setAchievements([created, ...achievements]);
        setIsModalOpen(false);
        setNewTitle("");
        setNewDesc("");
      } else {
        const errData = await res.json();
        setErrorMsg(errData.detail || "Failed to publish achievement.");
      }
    } catch (err) {
      console.error("Error posting achievement:", err);
      setErrorMsg("Network error trying to post achievement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = achievements.filter(item => {
    const matchesCat = selectedCategory === "All" || item.category === selectedCategory;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.studentName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Trophy className="h-8 w-8 text-amber-500" />
            Campus Achievement Wall
          </h1>
          <p className="mt-1.5 text-slate-500 text-sm">
            Celebrating national hackathon victories, research patents, university gold medals, and placement records of Saranathan College.
          </p>
        </div>

        {(user?.role === 'FACULTY_ADMIN' || user?.role === 'CLUB_ADMIN' || user?.role === 'SUPER_ADMIN') && (
          <button
            onClick={() => {
              setErrorMsg(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Post Achievement
          </button>
        )}
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative max-w-xs shrink-0">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student, dept, or title..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          />
        </div>
      </div>

      {/* Loading Skeleton / Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(idx => (
            <div key={idx} className="p-6 rounded-3xl border border-slate-200 bg-white space-y-4 animate-pulse">
              <div className="flex justify-between items-start">
                <div className="w-24 h-5 rounded-full bg-slate-200"></div>
                <div className="w-16 h-4 bg-slate-200 rounded"></div>
              </div>
              <div className="h-6 bg-slate-200 rounded w-4/5"></div>
              <div className="h-4 bg-slate-200 rounded w-full"></div>
              <div className="h-4 bg-slate-200 rounded w-2/3"></div>
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="w-24 h-4 bg-slate-200 rounded"></div>
                <div className="w-20 h-4 bg-slate-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200">
          <p className="text-slate-500 font-medium">No achievements found in this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((item) => (
            <div 
              key={item.id} 
              className="p-6 rounded-3xl border border-slate-200 bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${item.badgeColor}`}>
                    {item.category}
                  </span>
                  <span className="text-xs text-slate-400 font-medium shrink-0">{item.date}</span>
                </div>
                
                <h2 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight">
                  {item.title}
                </h2>

                <p className="text-slate-600 text-xs leading-relaxed">{item.description}</p>
              </div>
              
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-[10px]">
                    <UserIcon className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-bold text-slate-800 text-xs">{item.studentName}</span>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="bg-slate-100 text-slate-600 font-semibold px-2.5 py-1 rounded-lg text-[10px]">
                    {item.department}
                  </span>
                  {(user?.role === 'CLUB_ADMIN' || user?.role === 'SUPER_ADMIN') && (
                    <button
                      onClick={() => handleOpenEditModal(item)}
                      className="p-1 hover:bg-slate-50 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer animate-in fade-in"
                      title="Edit Achievement"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {(user?.role === 'FACULTY_ADMIN' || user?.role === 'CLUB_ADMIN' || user?.role === 'SUPER_ADMIN') && (
                    <button
                      onClick={() => handleDeleteAchievement(item.id)}
                      className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer animate-in fade-in"
                      title="Delete Achievement"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* POST ACHIEVEMENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-md border border-slate-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Post Campus Achievement
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleAddAchievement} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Achievement Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. 1st Place at National Level Hackathon 2025"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Hackathons">Hackathons</option>
                    <option value="Research & Patents">Research & Patents</option>
                    <option value="Placements">Placements</option>
                    <option value="University Ranks">University Ranks</option>
                    <option value="Sports & Culturals">Sports & Culturals</option>
                    <option value="Institution">Institution</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                  <select
                    value={newDept}
                    onChange={e => setNewDept(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                    <option value="Computer Science & Engineering (AI&ML)">Computer Science & Engineering (AI&ML)</option>
                    <option value="Computer Science & Business Systems">Computer Science & Business Systems</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Electronics & Communication Engineering">Electronics & Communication Engineering</option>
                    <option value="Electrical & Electronics Engineering">Electrical & Electronics Engineering</option>
                    <option value="Instrumentation & Control Engineering">Instrumentation & Control Engineering</option>
                    <option value="Mechanical Engineering">Mechanical Engineering</option>
                    <option value="Civil Engineering">Civil Engineering</option>
                    <option value="Artificial Intelligence & Data Science">Artificial Intelligence & Data Science</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Student / Team Name</label>
                <input
                  type="text"
                  required
                  value={newStudentName}
                  onChange={e => setNewStudentName(e.target.value)}
                  placeholder="e.g. Divya & Team Apex"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Achievement Summary</label>
                <textarea
                  required
                  rows={3}
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="Briefly describe the competition, cash award, research paper, or placement package..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Publish Achievement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ACHIEVEMENT MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-md border border-slate-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Edit Achievement
              </h3>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleEditAchievement} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Achievement Title</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  placeholder="e.g. 1st Place at National Level Hackathon 2025"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={editCategory}
                    onChange={e => setEditCategory(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Hackathons">Hackathons</option>
                    <option value="Research & Patents">Research & Patents</option>
                    <option value="Placements">Placements</option>
                    <option value="University Ranks">University Ranks</option>
                    <option value="Sports & Culturals">Sports & Culturals</option>
                    <option value="Institution">Institution</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                  <select
                    value={editDept}
                    onChange={e => setEditDept(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                    <option value="Computer Science & Engineering (AI&ML)">Computer Science & Engineering (AI&ML)</option>
                    <option value="Computer Science & Business Systems">Computer Science & Business Systems</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Electronics & Communication Engineering">Electronics & Communication Engineering</option>
                    <option value="Electrical & Electronics Engineering">Electrical & Electronics Engineering</option>
                    <option value="Instrumentation & Control Engineering">Instrumentation & Control Engineering</option>
                    <option value="Mechanical Engineering">Mechanical Engineering</option>
                    <option value="Civil Engineering">Civil Engineering</option>
                    <option value="Artificial Intelligence & Data Science">Artificial Intelligence & Data Science</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Student / Team Name</label>
                  <input
                    type="text"
                    required
                    value={editStudentName}
                    onChange={e => setEditStudentName(e.target.value)}
                    placeholder="e.g. Divya & Team Apex"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="text"
                    required
                    value={editDate}
                    onChange={e => setEditDate(e.target.value)}
                    placeholder="e.g. March 2025"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Achievement Summary</label>
                <textarea
                  required
                  rows={3}
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  placeholder="Briefly describe the competition, cash award, research paper, or placement package..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>

  );
};

export default AchievementsView;
