import React, { useState, useEffect } from 'react';
import { Award, Plus, X, Pencil, Trash2, Calendar, Link as LinkIcon, ChevronDown, ChevronUp, Loader2, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Competition {
  id: string;
  club_id: string;
  title: string;
  description: string;
  event_date: string;
  registration_link?: string;
}

interface Club {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  competitions: Competition[];
}

const ClubsHubView: React.FC = () => {
  const { user, token } = useAuth();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [expandedClubId, setExpandedClubId] = useState<string | null>(null);

  // Modals state
  const [isClubModalOpen, setIsClubModalOpen] = useState(false);
  const [isCompModalOpen, setIsCompModalOpen] = useState(false);
  const [editingClub, setEditingClub] = useState<Club | null>(null);
  const [editingComp, setEditingComp] = useState<Competition | null>(null);
  const [activeClubIdForComp, setActiveClubIdForComp] = useState<string | null>(null);

  // Form states
  const [clubName, setClubName] = useState('');
  const [clubDesc, setClubDesc] = useState('');
  const [clubLogo, setClubLogo] = useState('');

  const [compTitle, setCompTitle] = useState('');
  const [compDesc, setCompDesc] = useState('');
  const [compDate, setCompDate] = useState('');
  const [compLink, setCompLink] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';

  const isAdmin = user?.role === 'CLUB_ADMIN' || user?.role === 'SUPER_ADMIN';

  const fetchClubs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${baseUrl}/api/v1/clubs`);
      if (res.ok) {
        const data = await res.json();
        setClubs(data);
      } else {
        console.error("Failed to load clubs");
      }
    } catch (err) {
      console.error("Error fetching clubs:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClubs();
  }, []);

  const handleOpenClubModal = (club: Club | null = null) => {
    setErrorMsg(null);
    if (club) {
      setEditingClub(club);
      setClubName(club.name);
      setClubDesc(club.description || '');
      setClubLogo(club.logo || '');
    } else {
      setEditingClub(null);
      setClubName('');
      setClubDesc('');
      setClubLogo('');
    }
    setIsClubModalOpen(true);
  };

  const handleOpenCompModal = (clubId: string, comp: Competition | null = null) => {
    setErrorMsg(null);
    setActiveClubIdForComp(clubId);
    if (comp) {
      setEditingComp(comp);
      setCompTitle(comp.title);
      setCompDesc(comp.description);
      // Format ISO date string back into local datetime-local format 'YYYY-MM-DDTHH:MM'
      const formattedDate = new Date(comp.event_date).toISOString().slice(0, 16);
      setCompDate(formattedDate);
      setCompLink(comp.registration_link || '');
    } else {
      setEditingComp(null);
      setCompTitle('');
      setCompDesc('');
      setCompDate('');
      setCompLink('');
    }
    setIsCompModalOpen(true);
  };

  const handleSaveClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubName.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    const payload = {
      name: clubName.trim(),
      description: clubDesc.trim() || null,
      logo: clubLogo.trim() || null
    };

    try {
      const method = editingClub ? 'PUT' : 'POST';
      const url = editingClub ? `${baseUrl}/api/v1/clubs/${editingClub.id}` : `${baseUrl}/api/v1/clubs`;
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const savedClub = await res.json();
        if (editingClub) {
          setClubs(prev => prev.map(c => c.id === savedClub.id ? { ...savedClub, competitions: c.competitions } : c));
        } else {
          setClubs(prev => [...prev, savedClub]);
        }
        setIsClubModalOpen(false);
      } else {
        const err = await res.json();
        setErrorMsg(err.detail || "Failed to save club.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Network error saving club.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClub = async (clubId: string) => {
    if (!window.confirm("Are you sure you want to delete this club and all its competitions?")) return;
    try {
      const res = await fetch(`${baseUrl}/api/v1/clubs/${clubId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setClubs(prev => prev.filter(c => c.id !== clubId));
      } else {
        alert("Failed to delete club.");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting club.");
    }
  };

  const handleSaveComp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compTitle.trim() || !compDesc.trim() || !compDate || !activeClubIdForComp) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    const payload = {
      title: compTitle.trim(),
      description: compDesc.trim(),
      event_date: new Date(compDate).toISOString(),
      registration_link: compLink.trim() || null
    };

    try {
      const method = editingComp ? 'PUT' : 'POST';
      const url = editingComp 
        ? `${baseUrl}/api/v1/clubs/${activeClubIdForComp}/competitions/${editingComp.id}`
        : `${baseUrl}/api/v1/clubs/${activeClubIdForComp}/competitions`;

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const savedComp = await res.json();
        setClubs(prev => prev.map(c => {
          if (c.id === activeClubIdForComp) {
            let updatedComps = [...c.competitions];
            if (editingComp) {
              updatedComps = updatedComps.map(comp => comp.id === savedComp.id ? savedComp : comp);
            } else {
              updatedComps.push(savedComp);
            }
            // Sort competitions by date ascending
            updatedComps.sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
            return { ...c, competitions: updatedComps };
          }
          return c;
        }));
        setIsCompModalOpen(false);
      } else {
        const err = await res.json();
        setErrorMsg(err.detail || "Failed to save competition.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Network error saving competition.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComp = async (clubId: string, compId: string) => {
    if (!window.confirm("Are you sure you want to delete this competition?")) return;
    try {
      const res = await fetch(`${baseUrl}/api/v1/clubs/${clubId}/competitions/${compId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setClubs(prev => prev.map(c => {
          if (c.id === clubId) {
            return { ...c, competitions: c.competitions.filter(comp => comp.id !== compId) };
          }
          return c;
        }));
      } else {
        alert("Failed to delete competition.");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting competition.");
    }
  };

  const toggleExpand = (clubId: string) => {
    setExpandedClubId(prev => prev === clubId ? null : clubId);
  };

  const formatEventDate = (dateStr: string) => {
    if (!dateStr) return '';
    const hasTimezone = dateStr.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(dateStr);
    const cleanStr = hasTimezone ? dateStr : `${dateStr}Z`;
    const d = new Date(cleanStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Award className="h-8 w-8 text-indigo-600" />
            Beacon Clubs & Competitions
          </h1>
          <p className="mt-1.5 text-slate-500 text-sm">
            Discover student clubs, technical organizations, and upcoming competitions hosted across campus.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => handleOpenClubModal()}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Club Card
          </button>
        )}
      </div>

      {/* Loading & Empty State */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
          {[1, 2].map(idx => (
            <div key={idx} className="p-6 rounded-3xl border border-slate-200 bg-white space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-slate-200"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-5 bg-slate-200 rounded w-2/3"></div>
                  <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                </div>
              </div>
              <div className="h-12 bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : clubs.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 flex flex-col items-center justify-center space-y-3">
          <Info className="h-10 w-10 text-slate-400" />
          <p className="text-slate-500 font-medium">No clubs found. Create a new club to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {clubs.map(club => {
            const isExpanded = expandedClubId === club.id;
            return (
              <div
                key={club.id}
                className="p-6 rounded-3xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3.5">
                      {club.logo ? (
                        <img
                          src={club.logo}
                          alt={`${club.name} logo`}
                          className="w-12 h-12 rounded-2xl object-cover border border-slate-100 shadow-sm"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=100';
                          }}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-lg">
                          {club.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <h2 className="text-lg font-bold text-slate-900 leading-tight">{club.name}</h2>
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Student Chapter</span>
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleOpenClubModal(club)}
                          className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
                          title="Edit Club"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteClub(club.id)}
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-700 rounded-lg transition-colors cursor-pointer"
                          title="Delete Club"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-slate-600 text-xs leading-relaxed">
                    {club.description || "No description provided for this campus club."}
                  </p>
                </div>

                <div className="mt-6 pt-5 border-t border-slate-100 space-y-4">
                  <div className="flex justify-between items-center">
                    <button
                      onClick={() => toggleExpand(club.id)}
                      className="text-slate-800 hover:text-indigo-600 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          Hide Competitions ({club.competitions.length})
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          Show Upcoming Competitions ({club.competitions.length})
                        </>
                      )}
                    </button>

                    {isAdmin && (
                      <button
                        onClick={() => handleOpenCompModal(club.id)}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Competition
                      </button>
                    )}
                  </div>

                  {/* Nested Competitions List */}
                  {isExpanded && (
                    <div className="space-y-4 mt-2 max-h-96 overflow-y-auto pr-1">
                      {club.competitions.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No upcoming competitions listed at this time.</p>
                      ) : (
                        club.competitions.map(comp => (
                          <div key={comp.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl relative space-y-2">
                            <div className="flex justify-between items-start gap-4">
                              <h4 className="text-xs font-bold text-slate-900 pr-12">{comp.title}</h4>
                              {isAdmin && (
                                <div className="absolute top-3.5 right-3.5 flex items-center space-x-1">
                                  <button
                                    onClick={() => handleOpenCompModal(club.id, comp)}
                                    className="p-1 hover:bg-slate-200 text-slate-500 rounded transition-colors cursor-pointer"
                                    title="Edit Competition"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteComp(club.id, comp.id)}
                                    className="p-1 hover:bg-red-100 text-red-500 rounded transition-colors cursor-pointer"
                                    title="Delete Competition"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                            
                            <p className="text-[11px] text-slate-600 leading-normal">{comp.description}</p>
                            
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[10px] text-slate-500 font-medium">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                {formatEventDate(comp.event_date)}
                              </span>
                              {comp.registration_link && (
                                <a
                                  href={comp.registration_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-indigo-600 hover:underline font-bold"
                                >
                                  <LinkIcon className="w-3 h-3" />
                                  Register Now
                                </a>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CLUB MODAL */}
      {isClubModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-md border border-slate-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingClub ? 'Edit Club Info' : 'Create New Club'}
              </h3>
              <button onClick={() => setIsClubModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveClub} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Club Name</label>
                <input
                  type="text"
                  required
                  value={clubName}
                  onChange={e => setClubName(e.target.value)}
                  placeholder="e.g. Saranathan Robotics Club"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={clubDesc}
                  onChange={e => setClubDesc(e.target.value)}
                  placeholder="Tell students about your club, its goals, and members..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Logo URL (Optional)</label>
                <input
                  type="url"
                  value={clubLogo}
                  onChange={e => setClubLogo(e.target.value)}
                  placeholder="e.g. https://domain.com/logo.png"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsClubModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Club
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMPETITION MODAL */}
      {isCompModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-md border border-slate-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingComp ? 'Edit Competition Info' : 'Post New Competition'}
              </h3>
              <button onClick={() => setIsCompModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveComp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Competition Title</label>
                <input
                  type="text"
                  required
                  value={compTitle}
                  onChange={e => setCompTitle(e.target.value)}
                  placeholder="e.g. Autonomous Maze Runner 2025"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  required
                  rows={3}
                  value={compDesc}
                  onChange={e => setCompDesc(e.target.value)}
                  placeholder="Rules, venue details, prize pools, and eligibility criteria..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Event Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={compDate}
                    onChange={e => setCompDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Reg Link (Optional)</label>
                  <input
                    type="url"
                    value={compLink}
                    onChange={e => setCompLink(e.target.value)}
                    placeholder="e.g. https://google-forms.com/xxx"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCompModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Competition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClubsHubView;
