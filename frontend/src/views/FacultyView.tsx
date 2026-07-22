import React, { useState, useEffect } from 'react';
import { GraduationCap, Mail, MapPin, Search, Clock, Loader2 } from 'lucide-react';

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
  const [facultyList, setFacultyList] = useState<FacultyMember[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('All Departments');

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
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <GraduationCap className="h-8 w-8 text-indigo-600" />
          Faculty Directory
        </h1>
        <p className="mt-2 text-slate-500">Connect with department heads, professors, and academic advisors across campus.</p>
      </div>

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
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FacultyView;
