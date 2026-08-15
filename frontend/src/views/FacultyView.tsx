import React, { useState, useEffect } from 'react';
import { GraduationCap, Mail, MapPin, Search, Clock, Loader2, Edit3, Trash2, Plus, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface FacultyMember {
  id: string;
  name: string;
  designation: string;
  department: string;
  email: string;
  cabin: string;
  officeHours: string;
  status: 'Available' | 'In Class' | 'In Meeting';
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

const FacultyView: React.FC = () => {
  const { user, token } = useAuth();
  const [facultyList, setFacultyList] = useState<FacultyMember[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('All Departments');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDept, setEditDept] = useState(DEPARTMENTS[1]);
  const [editDesignation, setEditDesignation] = useState('');
  const [editOfficeLocation, setEditOfficeLocation] = useState('');
  const [editOfficeHours, setEditOfficeHours] = useState('10:00 AM - 12:00 PM');
  const [editStatus, setEditStatus] = useState<'Available' | 'In Class' | 'In Meeting'>('Available');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const myFacultyCard = user ? facultyList.find(f => f.email.toLowerCase() === user.email.toLowerCase()) : null;

  const handleDeleteFaculty = async (id: string) => {
    if (!token) return;
    if (!window.confirm("Are you sure you want to delete your faculty card?")) return;
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const res = await fetch(`${baseUrl}/api/v1/faculty/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setFacultyList(prev => prev.filter(f => f.id !== id));
        setSuccessMsg("Faculty card deleted successfully.");
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        const errData = await res.json();
        setErrorMsg(errData.detail || "Failed to delete faculty card.");
        setTimeout(() => setErrorMsg(null), 4000);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Network error deleting faculty card.");
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  const openEditModal = (member: FacultyMember) => {
    setEditId(member.id);
    setEditName(member.name);
    setEditDept(member.department);
    setEditDesignation(member.designation);
    setEditOfficeLocation(member.cabin);
    setEditOfficeHours(member.officeHours);
    setEditStatus(member.status);
    setErrorMsg(null);
    setIsEditModalOpen(true);
  };

  const openCreateModal = () => {
    setEditName(user?.name || '');
    setEditDept(user?.department || DEPARTMENTS[1]);
    setEditDesignation('Assistant Professor');
    setEditOfficeLocation('');
    setEditOfficeHours('10:00 AM - 12:00 PM');
    setEditStatus('Available');
    setErrorMsg(null);
    setIsCreateModalOpen(true);
  };

  const handleUpdateFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editId) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const res = await fetch(`${baseUrl}/api/v1/faculty/${editId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editName.trim(),
          department: editDept,
          designation: editDesignation.trim(),
          office_location: editOfficeLocation.trim(),
          office_hours: editOfficeHours.trim(),
          status: editStatus
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setFacultyList(prev => prev.map(f => f.id === editId ? updated : f));
        setIsEditModalOpen(false);
        setSuccessMsg("Faculty card updated successfully.");
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        const errData = await res.json();
        setErrorMsg(errData.detail || "Failed to update faculty card.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Network error updating faculty card.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !user) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const res = await fetch(`${baseUrl}/api/v1/faculty`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editName.trim(),
          department: editDept,
          designation: editDesignation.trim(),
          email: user.email,
          office_location: editOfficeLocation.trim(),
          office_hours: editOfficeHours.trim(),
          status: editStatus
        })
      });
      if (res.ok) {
        const created = await res.json();
        setFacultyList(prev => [created, ...prev]);
        setIsCreateModalOpen(false);
        setSuccessMsg("Faculty card created successfully!");
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        const errData = await res.json();
        setErrorMsg(errData.detail || "Failed to create faculty card.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Network error creating faculty card.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const fetchFaculty = async () => {
      setIsLoading(true);
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        const res = await fetch(`${baseUrl}/api/v1/faculty`);
        if (res.ok) {
          const data = await res.json();
          setFacultyList(data);
        } else {
          console.error('Failed to fetch faculty list');
        }
      } catch (err) {
        console.error('Error fetching faculty data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFaculty();
  }, []);

  const filteredFaculty = facultyList.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          member.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          member.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDept === 'All Departments' || member.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">
      <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <GraduationCap className="h-8 w-8 text-indigo-600" />
            Faculty Directory
          </h1>
          <p className="mt-2 text-slate-500">Connect with department heads, professors, and academic advisors across campus.</p>
        </div>

        {user?.role === 'FACULTY_ADMIN' && !myFacultyCard && (
          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create My Faculty Card
          </button>
        )}
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 font-semibold text-sm flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 font-semibold text-sm flex items-center gap-2 shadow-sm">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by faculty name, title, or department..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          />
        </div>

        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm cursor-pointer"
        >
          {DEPARTMENTS.map(dept => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
      </div>

      {/* Loading Skeleton / Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div key={idx} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm animate-pulse space-y-4">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 rounded-2xl bg-slate-200"></div>
                <div className="w-16 h-5 rounded-full bg-slate-200"></div>
              </div>
              <div className="h-5 bg-slate-200 rounded w-3/4"></div>
              <div className="h-4 bg-slate-200 rounded w-1/2"></div>
              <div className="h-3 bg-slate-200 rounded w-2/3"></div>
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <div className="h-3 bg-slate-200 rounded w-4/5"></div>
                <div className="h-3 bg-slate-200 rounded w-3/5"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredFaculty.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <p className="text-slate-500 font-medium">No faculty members found matching your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFaculty.map((faculty) => (
            <div key={faculty.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all flex flex-col justify-between group">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center text-lg border border-indigo-100 group-hover:scale-105 transition-transform">
                    {faculty.name.split(' ').pop()?.charAt(0) || 'F'}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                    faculty.status === 'Available' ? 'bg-green-50 text-green-700 border-green-200' :
                    faculty.status === 'In Class' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                    {faculty.status}
                  </span>
                </div>

                <h2 className="font-bold text-slate-900 text-lg group-hover:text-indigo-600 transition-colors">{faculty.name}</h2>
                <p className="text-xs font-semibold text-indigo-600 mt-0.5">{faculty.designation}</p>
                <p className="text-xs text-slate-500 mt-1">{faculty.department}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate">{faculty.email}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{faculty.cabin}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Hours: {faculty.officeHours}</span>
                </div>
              </div>

              {/* Edit/Delete Actions for Owner */}
              {user?.role === 'FACULTY_ADMIN' && faculty.email.toLowerCase() === user.email.toLowerCase() && (
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    onClick={() => openEditModal(faculty)}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1 cursor-pointer text-xs font-bold"
                    title="Edit Faculty Card"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteFaculty(faculty.id)}
                    className="p-1.5 hover:bg-red-50 rounded-lg text-slate-500 hover:text-red-600 transition-colors flex items-center gap-1 cursor-pointer text-xs font-bold"
                    title="Delete Faculty Card"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-md border border-slate-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-indigo-600" />
                Edit My Faculty Card
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

            <form onSubmit={handleUpdateFaculty} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    required
                    value={editDesignation}
                    onChange={e => setEditDesignation(e.target.value)}
                    placeholder="e.g. Associate Professor"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                  <select
                    value={editDept}
                    onChange={e => setEditDept(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {DEPARTMENTS.slice(1).map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cabin Location</label>
                  <input
                    type="text"
                    required
                    value={editOfficeLocation}
                    onChange={e => setEditOfficeLocation(e.target.value)}
                    placeholder="e.g. Main Block - Room 204"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Office Hours</label>
                  <input
                    type="text"
                    required
                    value={editOfficeHours}
                    onChange={e => setEditOfficeHours(e.target.value)}
                    placeholder="e.g. 10:00 AM - 12:00 PM"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Availability Status</label>
                <select
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Available">Available</option>
                  <option value="In Class">In Class</option>
                  <option value="In Meeting">In Meeting</option>
                </select>
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

      {/* CREATE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-md border border-slate-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-indigo-600" />
                Create My Faculty Card
              </h3>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
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

            <form onSubmit={handleCreateFaculty} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email (Read-Only)</label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-500 cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    required
                    value={editDesignation}
                    onChange={e => setEditDesignation(e.target.value)}
                    placeholder="e.g. Assistant Professor"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                  <select
                    value={editDept}
                    onChange={e => setEditDept(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {DEPARTMENTS.slice(1).map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cabin Location</label>
                  <input
                    type="text"
                    required
                    value={editOfficeLocation}
                    onChange={e => setEditOfficeLocation(e.target.value)}
                    placeholder="e.g. Main Block - Room 204"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Office Hours</label>
                  <input
                    type="text"
                    required
                    value={editOfficeHours}
                    onChange={e => setEditOfficeHours(e.target.value)}
                    placeholder="e.g. 10:00 AM - 12:00 PM"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Availability Status</label>
                <select
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Available">Available</option>
                  <option value="In Class">In Class</option>
                  <option value="In Meeting">In Meeting</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
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
                  Create Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default FacultyView;
