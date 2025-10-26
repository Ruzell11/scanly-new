// ============================================
// FILE: app/employer/candidates/page.tsx (FIXED)
// ============================================
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  Search,
  Download,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Calendar,
  FileText,
  Star,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import Sidebar from '@/app/components/sidebar';
import { API_URL } from '@/app/config/constants';

interface Candidate {
  id: number;
  full_name: string;
  email: string;
  phone?: string;
  resume_url?: string;
  cover_letter?: string;
  status: 'pending' | 'reviewing' | 'shortlisted' | 'rejected' | 'hired';
  applied_at: string;
  job_id: number;
  job_title: string;
  experience_years?: number;
  education?: string;
  location?: string;
  skills?: string[];
  ai_score?: number;
  ai_summary?: string;
}

export default function EmployerCandidatesPage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [userName, setUserName] = useState('HR Manager');
  const [userEmail, setUserEmail] = useState('hr@company.com');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [jobFilter, setJobFilter] = useState<string>('all');
  const [jobs, setJobs] = useState<{ id: number; title: string }[]>([]);

  const itemsPerPage = 10;

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token) {
      router.push('/login');
      return;
    }

    if (user) {
      try {
        const userData = JSON.parse(user);
        setUserName(userData.full_name || 'HR Manager');
        setUserEmail(userData.email || 'hr@company.com');
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }

    loadCandidates();
    loadJobs();
  }, []);

  const loadCandidates = async () => {
    const token = localStorage.getItem('token');
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching candidates from:', `${API_URL}/employer/candidates`);
      
      const response = await fetch(`${API_URL}/employer/candidates`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to fetch candidates: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Candidates data received:', data);
      console.log('Number of candidates:', data.length);

      if (!Array.isArray(data)) {
        console.error('Data is not an array:', data);
        throw new Error('Invalid response format: expected array');
      }

      setCandidates(data);
      
      if (data.length === 0) {
        console.warn('No candidates found - this is normal if no one has applied yet');
      }
    } catch (error: any) {
      console.error('Error loading candidates:', error);
      setError(error.message || 'Failed to load candidates');
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  };

  const loadJobs = async () => {
    const token = localStorage.getItem('token');
    try {
      console.log('Fetching jobs from:', `${API_URL}/employer/jobs`);
      
      const response = await fetch(`${API_URL}/employer/jobs`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch jobs');
      }

      const data = await response.json();
      console.log('Jobs data received:', data);
      
      setJobs(data.map((job: any) => ({ id: job.id, title: job.title })));
    } catch (error) {
      console.error('Error loading jobs:', error);
      setJobs([]);
    }
  };

  const handleUpdateStatus = async (candidateId: number, newStatus: string) => {
    const token = localStorage.getItem('token');
    try {
      console.log(`Updating candidate ${candidateId} status to ${newStatus}`);
      
      const response = await fetch(`${API_URL}/employer/candidates/${candidateId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to update status');
      }
      
      console.log('Status updated successfully');
      loadCandidates();
      
      if (selectedCandidate?.id === candidateId) {
        setSelectedCandidate({ ...selectedCandidate, status: newStatus as any });
      }
    } catch (error: any) {
      console.error('Error updating status:', error);
      alert(`Failed to update status: ${error.message}`);
    }
  };

  const handleViewCandidate = (candidate: Candidate) => {
    console.log('Viewing candidate:', candidate);
    setSelectedCandidate(candidate);
    setShowViewModal(true);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      reviewing: 'bg-blue-100 text-blue-800',
      shortlisted: 'bg-purple-100 text-purple-800',
      rejected: 'bg-red-100 text-red-800',
      hired: 'bg-green-100 text-green-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'reviewing': return <Eye className="w-4 h-4" />;
      case 'shortlisted': return <Star className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      case 'hired': return <CheckCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  // Filter candidates
  const filteredCandidates = candidates.filter(candidate => {
    const matchesSearch = !searchQuery || 
      candidate.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.job_title.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || candidate.status === statusFilter;
    const matchesJob = jobFilter === 'all' || candidate.job_id.toString() === jobFilter;
    
    return matchesSearch && matchesStatus && matchesJob;
  });

  const totalPages = Math.ceil(filteredCandidates.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCandidates = filteredCandidates.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3F5357] mx-auto mb-4"></div>
          <p className="text-white">Loading candidates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex">
      {/* Sidebar */}
      <Sidebar
        activeMenu="candidates"
        userRole="employer"
        userName={userName}
        userEmail={userEmail}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-white">
        <div className="p-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
            <span>Recruitment</span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900 font-medium">Candidates</span>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Candidates</h1>
              <p className="text-sm text-gray-500 mt-1">
                Manage and review job applications
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-gray-100 rounded-lg">
                <span className="text-sm text-gray-600">Total Applicants: </span>
                <span className="text-sm font-bold text-gray-900">{candidates.length}</span>
              </div>
              <button
                onClick={loadCandidates}
                className="px-4 py-2 bg-[#3F5357] hover:bg-[#344447] text-white rounded-lg transition-colors text-sm font-medium"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-900">Error Loading Candidates</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
                <button
                  onClick={loadCandidates}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {/* Debug Info (remove in production) */}
        

          {/* Filters */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative md:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search candidates..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3F5357] focus:border-transparent text-sm bg-white text-gray-900 placeholder:text-gray-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3F5357] focus:border-transparent text-sm bg-white text-gray-900 appearance-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="reviewing">Reviewing</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="rejected">Rejected</option>
                <option value="hired">Hired</option>
              </select>
            </div>

            {/* Job Filter */}
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={jobFilter}
                onChange={(e) => {
                  setJobFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3F5357] focus:border-transparent text-sm bg-white text-gray-900 appearance-none cursor-pointer"
              >
                <option value="all">All Positions</option>
                {jobs.map(job => (
                  <option key={job.id} value={job.id}>{job.title}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#d4dfe3]">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Candidate
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Applied For
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Applied Date
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    AI Score
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedCandidates.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <FileText className="w-12 h-12 text-gray-400 mb-4" />
                        <p className="text-gray-900 font-medium mb-1">No candidates found</p>
                        <p className="text-sm text-gray-500">
                          {candidates.length === 0 
                            ? "Applications will appear here once candidates apply to your jobs."
                            : "Try adjusting your filters to see more candidates."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedCandidates.map((candidate) => (
                    <tr key={candidate.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-gray-300"
                          />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {candidate.full_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {candidate.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900">
                          {candidate.job_title}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">
                          {new Date(candidate.applied_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(candidate.status)}`}>
                          {getStatusIcon(candidate.status)}
                          {candidate.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {candidate.ai_score ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[80px]">
                              <div 
                                className={`h-2 rounded-full ${
                                  candidate.ai_score >= 80 ? 'bg-green-600' :
                                  candidate.ai_score >= 60 ? 'bg-blue-600' :
                                  candidate.ai_score >= 40 ? 'bg-yellow-600' :
                                  'bg-red-600'
                                }`}
                                style={{ width: `${candidate.ai_score}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-700">
                              {candidate.ai_score}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewCandidate(candidate)}
                            className="text-sm text-[#3F5357] hover:text-[#2C2C2C] font-medium"
                          >
                            View Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === i + 1
                      ? 'bg-gray-800 text-white'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  {i + 1}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </main>

      {/* View Candidate Modal */}
      {showViewModal && selectedCandidate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">
                    {selectedCandidate.full_name}
                  </h2>
                  <p className="text-gray-500 text-sm">
                    Applied for: {selectedCandidate.job_title}
                  </p>
                </div>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <Mail className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm font-medium text-gray-900">{selectedCandidate.email}</p>
                  </div>
                </div>
                {selectedCandidate.phone && (
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <Phone className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="text-sm font-medium text-gray-900">{selectedCandidate.phone}</p>
                    </div>
                  </div>
                )}
                {selectedCandidate.location && (
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <MapPin className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">Location</p>
                      <p className="text-sm font-medium text-gray-900">{selectedCandidate.location}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {selectedCandidate.experience_years !== undefined && (
                  <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <Briefcase className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-xs text-blue-600">Experience</p>
                      <p className="text-sm font-bold text-blue-900">
                        {selectedCandidate.experience_years} years
                      </p>
                    </div>
                  </div>
                )}
                {selectedCandidate.education && (
                  <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <GraduationCap className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="text-xs text-purple-600">Education</p>
                      <p className="text-sm font-bold text-purple-900">{selectedCandidate.education}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                  <Calendar className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-xs text-green-600">Applied On</p>
                    <p className="text-sm font-bold text-green-900">
                      {new Date(selectedCandidate.applied_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* AI Analysis */}
              {selectedCandidate.ai_score && (
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border-2 border-indigo-200 mb-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-indigo-900 mb-1">
                        🤖 AI Match Analysis
                      </h3>
                      <p className="text-sm text-indigo-600">
                        Automated resume analysis and job fit assessment
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-indigo-900">
                        {selectedCandidate.ai_score}%
                      </div>
                      <p className="text-xs text-indigo-600">Match Score</p>
                    </div>
                  </div>
                  {selectedCandidate.ai_summary && (
                    <div className="bg-white rounded-lg p-4 border border-indigo-200">
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {selectedCandidate.ai_summary}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Skills */}
              {selectedCandidate.skills && selectedCandidate.skills.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 mb-6">
                  <label className="block text-sm font-medium text-gray-500 mb-3">
                    Skills & Technologies
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {selectedCandidate.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-white border border-gray-300 text-gray-700 text-sm rounded-full"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Cover Letter */}
              {selectedCandidate.cover_letter && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 mb-6">
                  <label className="block text-sm font-medium text-gray-500 mb-2">
                    Cover Letter
                  </label>
                  <p className="text-base text-gray-700 leading-relaxed whitespace-pre-line">
                    {selectedCandidate.cover_letter}
                  </p>
                </div>
              )}

              {/* Resume Link */}
              {selectedCandidate.resume_url && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 mb-6">
                  <label className="block text-sm font-medium text-blue-900 mb-2">
                    Resume / CV
                  </label>
                  <a
                    href={selectedCandidate.resume_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
                  >
                    <Download className="w-4 h-4" />
                    Download Resume
                  </a>
                </div>
              )}

              {/* Status Update */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Update Application Status
                </label>
                <div className="flex flex-wrap gap-2">
                  {['pending', 'reviewing', 'shortlisted', 'rejected', 'hired'].map((status) => (
                    <button
                      key={status}
                      onClick={() => handleUpdateStatus(selectedCandidate.id, status)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        selectedCandidate.status === status
                          ? 'bg-gray-800 text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-colors font-medium"
                >
                  Close
                </button>
                <button
                  onClick={() => window.open(`mailto:${selectedCandidate.email}`, '_blank')}
                  className="px-6 py-3 bg-[#3F5357] hover:bg-[#344447] text-white rounded-lg transition-colors font-medium flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Send Email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}