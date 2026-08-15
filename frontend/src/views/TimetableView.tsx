import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, CheckCircle2, AlertCircle, Calendar, Plus, Edit2, Trash2, X, Save, Table } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

interface TimetableSlot {
  id: string;
  day_of_week: string;
  time_slot: string;
  subject_name: string;
  room_number: string;
  is_active: boolean;
}

const TimetableView: React.FC = () => {
  const { token, addXP } = useAuth();
  const [schedule, setSchedule] = useState<TimetableSlot[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'view' | 'edit_grid'>('view');

  // Edit / Add Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<Partial<TimetableSlot> | null>(null);

  const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // 1. Fetch Active Timetable
  const fetchMyTimetable = async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${baseUrl}/timetable/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSchedule(response.data);
    } catch (err) {
      console.error("Failed to load active timetable", err);
    }
  };

  useEffect(() => {
    fetchMyTimetable();
  }, [token]);

  // 2. Dropzone File Upload Handler
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setSuccessMsg(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'multipart/form-data'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await axios.post(`${baseUrl}/timetable/upload`, formData, { headers });

      setSchedule(response.data.schedule);
      setSuccessMsg(`Timetable loaded! You can verify or edit any class subject and room number below.`);
      addXP(50, "Uploaded Timetable");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to process file. You can enter your class schedule using the Grid Editor below.");
    } finally {
      setIsUploading(false);
    }
  }, [token, baseUrl]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.bmp', '.gif', '.tiff', '.heic', '.heif', '.svg'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxFiles: 1,
  });

  // 3. Save or Update Single Slot Handler
  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlot || !editingSlot.subject_name || !editingSlot.day_of_week) return;

    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.post(
        `${baseUrl}/timetable/slot`,
        {
          id: editingSlot.id,
          day_of_week: editingSlot.day_of_week,
          time_slot: editingSlot.time_slot || "09:00 AM - 10:00 AM",
          subject_name: editingSlot.subject_name,
          room_number: editingSlot.room_number || "Main Block 101"
        },
        { headers }
      );

      if (editingSlot.id) {
        setSchedule(schedule.map(s => s.id === editingSlot.id ? response.data : s));
      } else {
        setSchedule([...schedule, response.data]);
      }

      setIsModalOpen(false);
      setEditingSlot(null);
      setSuccessMsg("Class slot saved!");
    } catch (err) {
      setError("Could not save class slot.");
    }
  };

  // 4. Delete Slot Handler
  const handleDeleteSlot = async (slotId: string) => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.delete(`${baseUrl}/timetable/slot/${slotId}`, { headers });
      setSchedule(schedule.filter(s => s.id !== slotId));
      setSuccessMsg("Class slot deleted.");
    } catch (err) {
      setError("Failed to delete slot.");
    }
  };

  // Group slots by day
  const groupedSchedule = days.reduce((acc, day) => {
    acc[day] = schedule.filter(s => s.day_of_week.toLowerCase().includes(day.toLowerCase()));
    return acc;
  }, {} as Record<string, TimetableSlot[]>);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">
      <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Calendar className="h-8 w-8 text-indigo-600" />
            Weekly Class Schedule
          </h1>
          <p className="mt-1.5 text-slate-500 text-sm">
            Upload your timetable file or customize your weekly class subjects, times, and room numbers below.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab(activeTab === 'view' ? 'edit_grid' : 'view')}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer border border-slate-200"
          >
            <Table className="w-4 h-4 text-indigo-600" />
            {activeTab === 'view' ? 'Grid Table Mode' : 'Card View Mode'}
          </button>

          <button
            onClick={() => {
              setEditingSlot({ day_of_week: "Monday", time_slot: "09:00 AM - 10:00 AM", subject_name: "", room_number: "Main Block 101" });
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Class Slot
          </button>
        </div>
      </div>

      {/* DROPZONE */}
      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer ${
          isDragActive ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50 bg-white'
        }`}
      >
        <input {...getInputProps()} />
        <div className={`p-3.5 rounded-2xl ${isDragActive ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
          <UploadCloud className="w-8 h-8" />
        </div>
        <h3 className="mt-3 text-sm font-semibold text-slate-800">
          {isDragActive ? "Drop your schedule here..." : "Upload Timetable Image or PDF"}
        </h3>
        <p className="mt-1 text-xs text-slate-400 text-center">
          Supports JPG, PNG, WEBP, HEIC, PDF. You can also edit any subject or time slot below!
        </p>
      </div>

      {/* FEEDBACK STATES */}
      {isUploading && (
        <div className="flex items-center justify-center space-x-3 text-indigo-600 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 animate-pulse">
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="font-medium text-xs">Processing document schedule...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center space-x-3 text-red-600 p-4 bg-red-50 rounded-2xl border border-red-100">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-xs font-medium">{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center space-x-3 text-green-700 p-4 bg-green-50 rounded-2xl border border-green-200">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-green-600" />
          <span className="text-xs font-medium">{successMsg}</span>
        </div>
      )}

      {/* SCHEDULE CARD VIEW */}
      {activeTab === 'view' && schedule.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-lg font-bold text-slate-900">Your Active Weekly Schedule</h2>
            <span className="text-xs text-slate-500 font-medium">{schedule.length} Total Class Slots</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {days.map(day => {
              const daySlots = groupedSchedule[day] || [];
              if (daySlots.length === 0) return null;

              return (
                <div key={day} className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-indigo-600 text-sm tracking-wide">{day}</h3>
                    <span className="text-[11px] bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-bold">
                      {daySlots.length} Classes
                    </span>
                  </div>

                  <div className="space-y-3">
                    {daySlots.map((slot) => (
                      <div key={slot.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-2 group relative hover:border-indigo-200 transition-all">
                        <div className="flex justify-between items-start pr-12">
                          <span className="font-bold text-xs text-slate-900 leading-tight">{slot.subject_name}</span>
                        </div>
                        
                        <div className="flex items-center justify-between pt-1 text-[11px]">
                          <span className="text-slate-500 font-medium">{slot.time_slot}</span>
                          <span className="font-mono bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-md font-semibold text-[10px]">
                            {slot.room_number}
                          </span>
                        </div>

                        <div className="absolute top-3 right-3 flex items-center space-x-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setEditingSlot(slot);
                              setIsModalOpen(true);
                            }}
                            className="p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-white transition-colors"
                            title="Edit Slot"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSlot(slot.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-white transition-colors"
                            title="Delete Slot"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FULL GRID TABLE MODE */}
      {activeTab === 'edit_grid' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm overflow-x-auto space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Weekly Timetable Table</h2>
            <button
              onClick={() => {
                setEditingSlot({ day_of_week: "Monday", time_slot: "09:00 AM - 10:00 AM", subject_name: "", room_number: "Main Block 101" });
                setIsModalOpen(true);
              }}
              className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Row
            </button>
          </div>

          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-bold">
                <th className="p-3">Day</th>
                <th className="p-3">Time Slot</th>
                <th className="p-3">Subject Name</th>
                <th className="p-3">Room / Venue</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map(slot => (
                <tr key={slot.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                  <td className="p-3 font-semibold text-indigo-600">{slot.day_of_week}</td>
                  <td className="p-3 text-slate-600">{slot.time_slot}</td>
                  <td className="p-3 font-bold text-slate-900">{slot.subject_name}</td>
                  <td className="p-3 font-mono text-slate-600">{slot.room_number}</td>
                  <td className="p-3 text-right space-x-2">
                    <button
                      onClick={() => {
                        setEditingSlot(slot);
                        setIsModalOpen(true);
                      }}
                      className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSlot(slot.id)}
                      className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* EDIT / ADD SLOT MODAL */}
      {isModalOpen && editingSlot && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-md border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingSlot.id ? "Edit Class Subject & Slot" : "Add New Class Slot"}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSlot} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subject Name</label>
                <input
                  type="text"
                  required
                  value={editingSlot.subject_name || ''}
                  onChange={e => setEditingSlot({ ...editingSlot, subject_name: e.target.value })}
                  placeholder="e.g. Data Structures & Algorithms"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Day of the Week</label>
                  <select
                    value={editingSlot.day_of_week || 'Monday'}
                    onChange={e => setEditingSlot({ ...editingSlot, day_of_week: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {days.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Room / Venue</label>
                  <input
                    type="text"
                    required
                    value={editingSlot.room_number || ''}
                    onChange={e => setEditingSlot({ ...editingSlot, room_number: e.target.value })}
                    placeholder="e.g. Main Block 204"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Time Slot</label>
                <input
                  type="text"
                  required
                  value={editingSlot.time_slot || ''}
                  onChange={e => setEditingSlot({ ...editingSlot, time_slot: e.target.value })}
                  placeholder="e.g. 09:00 AM - 10:00 AM"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  Save Class Slot
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

export default TimetableView;
