import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Users, ExternalLink, Send, X, Globe, GitBranch, Award, CheckCircle2, Search, Sliders } from 'lucide-react';
import axios from 'axios';

interface ProofOfSkills {
  github_url: string;
  portfolio_url: string;
  certificate_links: string;
}

interface ProfileResponse {
  id: string | null;
  user_id: string;
  opt_in_status: boolean;
  skills: string[];
  proof_of_skills: ProofOfSkills;
  past_achievements_summary: string;
  name: string;
  email: string;
  department: string;
  role: string;
}

interface MatchResponseItem {
  profile: ProfileResponse;
  match_percentage: number;
  matching_skills: string[];
}

const CongruenceView: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [showSetupModal, setShowSetupModal] = useState(false);
  
  // Setup Modal Form State
  const [optInStatus, setOptInStatus] = useState(true);
  const [skillsInput, setSkillsInput] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [certificateLinks, setCertificateLinks] = useState('');
  const [pastAchievements, setPastAchievements] = useState('');
  
  // Search & Match State
  const [searchQuery, setSearchQuery] = useState('');
  const [candidates, setCandidates] = useState<MatchResponseItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';

  // 1. Fetch current user's congruence profile
  const fetchMyProfile = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${baseUrl}/congruence/profile/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data) {
        // Pre-populate form state
        setOptInStatus(res.data.opt_in_status);
        setSkillsInput(res.data.skills ? res.data.skills.join(', ') : '');
        setGithubUrl(res.data.proof_of_skills?.github_url || '');
        setPortfolioUrl(res.data.proof_of_skills?.portfolio_url || '');
        setCertificateLinks(res.data.proof_of_skills?.certificate_links || '');
        setPastAchievements(res.data.past_achievements_summary || '');
      }
    } catch (err) {
      console.error("Failed to load congruence profile:", err);
    }
  };

  useEffect(() => {
    fetchMyProfile();
  }, [token]);

  // 2. Handle Profile Submit
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setIsSavingProfile(true);
    setErrorMsg(null);

    const payload = {
      opt_in_status: optInStatus,
      skills: skillsInput.split(',').map(s => s.trim()).filter(Boolean),
      proof_of_skills: {
        github_url: githubUrl.trim(),
        portfolio_url: portfolioUrl.trim(),
        certificate_links: certificateLinks.trim()
      },
      past_achievements_summary: pastAchievements.trim()
    };

    try {
      const res = await axios.post(`${baseUrl}/congruence/profile`, payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      if (res.status === 200 || res.status === 201) {
        setSuccessMsg("Congruence profile updated successfully!");
        setShowSetupModal(false);
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (err: any) {
      console.error("Error saving congruence profile:", err);
      setErrorMsg(err.response?.data?.detail || "Failed to update profile. Please try again.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // 3. Search / Match Candidates
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !searchQuery.trim()) return;

    setIsSearching(true);
    setErrorMsg(null);

    try {
      const res = await axios.post(
        `${baseUrl}/congruence/match`,
        { query: searchQuery.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCandidates(res.data);
    } catch (err: any) {
      console.error("Error searching candidates:", err);
      setErrorMsg(err.response?.data?.detail || "Failed to process RAG skill-matching.");
    } finally {
      setIsSearching(false);
    }
  };

  // 4. Send Direct Message Connection
  const handleStartDM = (candidate: ProfileResponse) => {
    navigate('/dms', {
      state: {
        targetEmail: candidate.email,
        targetName: candidate.name,
        targetId: candidate.user_id
      }
    });
  };

  const getScoreBadgeColor = (pct: number) => {
    if (pct >= 85) return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    if (pct >= 60) return 'bg-indigo-50 text-indigo-700 border border-indigo-200';
    return 'bg-slate-100 text-slate-700 border border-slate-200';
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-955 to-slate-900 rounded-3xl p-6 md:p-8 shadow-xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-10 -left-10 w-96 h-96 bg-primary-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center space-x-2 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full text-xs font-bold mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              <span>RAG-Powered AI Matching</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">
              Congruence
            </h1>
            <p className="mt-2 text-slate-300 text-sm leading-relaxed">
              Find the perfect team members for SIH, hackathons, and research projects. Our autonomous semantic vector RAG models parse skills, proofs of work, and portfolio links to find perfect fits.
            </p>
          </div>

          <button
            onClick={() => setShowSetupModal(true)}
            className="px-6 py-3 bg-white hover:bg-slate-100 text-indigo-950 font-bold text-sm rounded-2xl shadow-lg transition-all flex items-center space-x-2 shrink-0 cursor-pointer"
          >
            <Sliders className="w-4 h-4 text-indigo-600" />
            <span>Setup Skill Profile</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-semibold flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold shadow-sm animate-in fade-in">
          {errorMsg}
        </div>
      )}

      {/* Main Matching Dashboard */}
      <div className="grid grid-cols-1 gap-8">
        
        {/* Search Input Box Card */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-8 space-y-6">
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <span>Discover Team Candidates</span>
          </h2>
          
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-4 top-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter what you are looking for, e.g. 'Frontend react engineer who has won hackathons and knows docker'"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-2xl shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition-all flex items-center justify-center space-x-2 shrink-0 cursor-pointer"
            >
              {isSearching ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Matching...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Run Congruence Matching</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Candidate List Results */}
        <div className="space-y-4">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
              {candidates.length > 0 ? `Matched Candidates (${candidates.length})` : 'Search Results'}
            </h3>
          </div>

          {candidates.length === 0 ? (
            <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-3xl space-y-4">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                <Users className="w-8 h-8" />
              </div>
              <div className="max-w-xs mx-auto space-y-1">
                <p className="text-sm font-bold text-slate-700">No search run yet</p>
                <p className="text-xs text-slate-400">
                  Enter your team project needs above to query our RAG vector skill matches.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {candidates.map(({ profile, match_percentage, matching_skills }) => (
                <div
                  key={profile.user_id}
                  className="bg-white border border-slate-100 hover:border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-6 group"
                >
                  <div>
                    {/* Header */}
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-650 flex items-center justify-center text-white font-extrabold text-lg shadow-inner group-hover:scale-105 transition-transform">
                          {profile.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-900 group-hover:text-indigo-650 transition-colors">
                            {profile.name}
                          </h4>
                          <p className="text-xs text-indigo-500 font-semibold">{profile.department}</p>
                        </div>
                      </div>

                      <span className={`px-3 py-1 rounded-full text-xs font-black tracking-tight ${getScoreBadgeColor(match_percentage)}`}>
                        {match_percentage}% Match
                      </span>
                    </div>

                    {/* Past achievements text */}
                    {profile.past_achievements_summary && (
                      <p className="mt-4 text-xs text-slate-500 line-clamp-3 leading-relaxed">
                        &ldquo;{profile.past_achievements_summary}&rdquo;
                      </p>
                    )}

                    {/* Skills section */}
                    <div className="mt-4 space-y-2">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Skills</p>
                      <div className="flex flex-wrap gap-1.5">
                        {profile.skills.map((skill) => {
                          const isMatched = matching_skills.some(m => m.toLowerCase() === skill.toLowerCase());
                          return (
                            <span
                              key={skill}
                              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                                isMatched
                                  ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200'
                                  : 'bg-slate-50 text-slate-600 border border-slate-200/60'
                              }`}
                            >
                              {skill}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Proof of skills URLs */}
                    <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                      {profile.proof_of_skills?.github_url && (
                        <a
                          href={profile.proof_of_skills.github_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-1 hover:text-indigo-650 font-medium"
                        >
                          <GitBranch className="w-3.5 h-3.5" />
                          <span>GitHub</span>
                          <ExternalLink className="w-3 h-3 opacity-60" />
                        </a>
                      )}
                      {profile.proof_of_skills?.portfolio_url && (
                        <a
                          href={profile.proof_of_skills.portfolio_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-1 hover:text-indigo-650 font-medium"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          <span>Portfolio</span>
                          <ExternalLink className="w-3 h-3 opacity-60" />
                        </a>
                      )}
                      {profile.proof_of_skills?.certificate_links && (
                        <a
                          href={profile.proof_of_skills.certificate_links}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-1 hover:text-indigo-650 font-medium"
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>Certificates</span>
                          <ExternalLink className="w-3 h-3 opacity-60" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                      Role: {profile.role}
                    </span>
                    <button
                      onClick={() => handleStartDM(profile)}
                      className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Invite to Team</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Setup Modal */}
      {showSetupModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowSetupModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Setup Your Congruence Profile</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Optimize your matching potential. Submit your skills and links to allow students to find you semantically.
                </p>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                {/* Opt in toggle */}
                <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                  <div>
                    <label className="text-sm font-bold text-slate-800">Opt In to Matching</label>
                    <p className="text-[11px] text-slate-400">Makes your profile visible in similarity searches.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={optInStatus}
                    onChange={(e) => setOptInStatus(e.target.checked)}
                    className="w-5 h-5 text-indigo-650 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                </div>

                {/* Skills */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Skills (comma separated)
                  </label>
                  <input
                    type="text"
                    value={skillsInput}
                    onChange={(e) => setSkillsInput(e.target.value)}
                    placeholder="e.g. React, TypeScript, Python, PyTorch, Docker"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                {/* GitHub */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
                    <GitBranch className="w-3.5 h-3.5" />
                    <span>GitHub URL</span>
                  </label>
                  <input
                    type="url"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/username"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Portfolio */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
                    <Globe className="w-3.5 h-3.5" />
                    <span>Portfolio Website URL</span>
                  </label>
                  <input
                    type="url"
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                    placeholder="https://yourname.dev"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Certificates */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
                    <Award className="w-3.5 h-3.5" />
                    <span>Certificate Links / Verification URL</span>
                  </label>
                  <input
                    type="url"
                    value={certificateLinks}
                    onChange={(e) => setCertificateLinks(e.target.value)}
                    placeholder="https://coursera.org/verify/..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Achievements Summary */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Past Achievements & Bio Summary
                  </label>
                  <textarea
                    value={pastAchievements}
                    onChange={(e) => setPastAchievements(e.target.value)}
                    placeholder="Provide a summary of your hackathons, projects, coding accomplishments, and role interests."
                    rows={4}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>

                {/* Submit button */}
                <div className="pt-2 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowSetupModal(false)}
                    className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-sm rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl disabled:opacity-50 transition-all flex items-center space-x-1.5 cursor-pointer"
                  >
                    {isSavingProfile ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Save Profile</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CongruenceView;
