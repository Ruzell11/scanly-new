// ============================================
// FILE: app/employer/candidates/page.tsx (WITH EMAIL COMPOSER)
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
  Send, // Added for email button
} from 'lucide-react';
import Sidebar from '@/app/components/sidebar';
import { API_URL } from '@/app/config/constants';
import EmailComposer from './components/EmailComposer';

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
  const [showEmailComposer, setShowEmailComposer] = useState(false); // Add state for email composer
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
      const response = await fetch(`${API_URL}/employer/candidates`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch candidates`);
      }

      const data = await response.json();
      setCandidates(data);
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
      setJobs(data.map((job: any) => ({ id: job.id, title: job.title })));
    } catch (error) {
      console.error('Error loading jobs:', error);
      setJobs([]);
    }
  };

  const handleUpdateStatus = async (candidateId: number, newStatus: string) => {
    const token = localStorage.getItem('token');
    try {
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
    setSelectedCandidate(candidate);
    setShowViewModal(true);
  };

  // New function to open email composer
  const handleSendEmail = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setShowEmailComposer(true);
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
    const icons = {
      pending: <Clock className="w-4 h-4" />,
      reviewing: <Eye className="w-4 h-4" />,
      shortlisted: <Star className="w-4 h-4" />,
      rejected: <XCircle className="w-4 h-4" />,
      hired: <CheckCircle className="w-4 h-4" />,
    };
    return icons[status as keyof typeof icons] || <AlertCircle className="w-4 h-4" />;
  };

  const filteredCandidates = candidates.filter((candidate) => {
    const matchesSearch = 
      candidate.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.job_title.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || candidate.status === statusFilter;
    const matchesJob = jobFilter === 'all' || candidate.job_id.toString() === jobFilter;
    
    return matchesSearch && matchesStatus && matchesJob;
  });

  const totalPages = Math.ceil(filteredCandidates.length / itemsPerPage);
  const paginatedCandidates = filteredCandidates.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="flex min-h-screen bg-gray-50 text-black">
     <Sidebar
             activeMenu="candidates"
             userRole="employer"
             userName={userName}
             userEmail={userEmail}
           />

      <div className="flex-1 p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Candidate Management</h1>
          <p className="text-gray-600">Review and manage all job applications</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search candidates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3F5357] focus:border-transparent"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3F5357] bg-white"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="reviewing">Reviewing</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="rejected">Rejected</option>
                <option value="hired">Hired</option>
              </select>
            </div>

            {/* Job Filter */}
            <div>
              <select
                value={jobFilter}
                onChange={(e) => setJobFilter(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3F5357] bg-white"
              >
                <option value="all">All Jobs</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id.toString()}>
                    {job.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing <span className="font-semibold text-gray-900">{paginatedCandidates.length}</span> of{' '}
              <span className="font-semibold text-gray-900">{filteredCandidates.length}</span> candidates
            </p>
            <div className="flex gap-2">
              {['pending', 'reviewing', 'shortlisted', 'rejected', 'hired'].map((status) => {
                const count = filteredCandidates.filter((c) => c.status === status).length;
                return (
                  <div key={status} className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                    {status}: {count}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Candidates Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3F5357]"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 font-medium mb-2">Error loading candidates</p>
              <p className="text-gray-600 text-sm mb-4">{error}</p>
              <button
                onClick={loadCandidates}
                className="px-4 py-2 bg-[#3F5357] text-white rounded-lg hover:bg-[#344447] transition-colors"
              >
                Retry
              </button>
            </div>
          ) : paginatedCandidates.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium mb-2">No candidates found</p>
              <p className="text-gray-500 text-sm">Try adjusting your filters or search query</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Candidate
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Position
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Applied Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      AI Score
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedCandidates.map((candidate) => (
                    <tr key={candidate.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{candidate.full_name}</div>
                          <div className="text-sm text-gray-500">{candidate.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{candidate.job_title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(candidate.status)}`}>
                          {getStatusIcon(candidate.status)}
                          {candidate.status.charAt(0).toUpperCase() + candidate.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(candidate.applied_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {candidate.ai_score ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full"
                                style={{ width: `${candidate.ai_score}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-700">{candidate.ai_score}%</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleSendEmail(candidate)}
                            className="p-2 hover:bg-blue-50 rounded-lg transition-colors group"
                            title="Send Email"
                          >
                            <Send className="w-4 h-4 text-blue-600 group-hover:text-blue-700" />
                          </button>
                          <button
                            onClick={() => handleViewCandidate(candidate)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors group"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4 text-gray-600 group-hover:text-gray-900" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Email Composer Modal */}
      {showEmailComposer && selectedCandidate && (
        <EmailComposer
          isOpen={showEmailComposer}
          onClose={() => setShowEmailComposer(false)}
          candidate={{
            id: selectedCandidate.id,
            full_name: selectedCandidate.full_name,
            email: selectedCandidate.email,
            job_title: selectedCandidate.job_title,
          }}
          onEmailSent={() => {
            console.log('Email sent successfully');
            // Optionally reload candidates or update UI
          }}
        />
      )}

      {/* View Candidate Modal (keeping your existing modal) */}
      {showViewModal && selectedCandidate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="overflow-y-auto max-h-[90vh] p-8">
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
                  onClick={() => {
                    setShowViewModal(false);
                    handleSendEmail(selectedCandidate);
                  }}
                  className="px-6 py-3 bg-[#3F5357] hover:bg-[#344447] text-white rounded-lg transition-colors font-medium flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Compose Email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}