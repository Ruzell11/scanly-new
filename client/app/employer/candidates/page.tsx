'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash,
  Search,
  Download,
  Mail,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Star,
  X,
  Map,
  Phone,
  MapPin,
  GraduationCap,
  Calendar,
  Briefcase
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
  ai_feedback?: string;
}

export default function EmployerCandidatesPage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEmailComposer, setShowEmailComposer] = useState(false);
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
    
    if (!token) router.push('/login');

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
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch candidates');

      const data: Candidate[] = await response.json();
      // Filter out deleted candidates (just in case backend doesn't filter)
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
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to fetch jobs');
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
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) throw new Error('Failed to update status');
      loadCandidates();
      if (selectedCandidate?.id === candidateId) setSelectedCandidate({ ...selectedCandidate, status: newStatus as any });
    } catch (error: any) {
      console.error('Error updating status:', error);
      alert(`Failed to update status: ${error.message}`);
    }
  };

  // Soft-delete candidate
  const handleDeleteCandidate = async (candidateId: number) => {
    if (!confirm('Are you sure you want to delete this candidate?')) return;

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/users/delete/${candidateId}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to delete candidate');
      loadCandidates();
    } catch (error: any) {
      console.error('Error deleting candidate:', error);
      alert(`Failed to delete candidate: ${error.message}`);
    }
  };

  const handleViewCandidate = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setShowViewModal(true);
  };

  const handleSendEmail = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setShowEmailComposer(true);
  };

  const getStatusColor = (status: string) => ({
    pending: 'bg-yellow-100 text-yellow-800',
    reviewing: 'bg-blue-100 text-blue-800',
    shortlisted: 'bg-purple-100 text-purple-800',
    rejected: 'bg-red-100 text-red-800',
    hired: 'bg-green-100 text-green-800',
      offer: 'bg-green-100 text-green-800',
  }[status] || 'bg-gray-100 text-gray-800');

  const getStatusIcon = (status: string) => ({
    pending: <Clock className="w-4 h-4" />,
    reviewing: <Eye className="w-4 h-4" />,
    shortlisted: <Star className="w-4 h-4" />,
    rejected: <XCircle className="w-4 h-4" />,
    hired: <CheckCircle className="w-4 h-4" />,
     offer: <CheckCircle className="w-4 h-4" />,
  }[status] || <AlertCircle className="w-4 h-4" />);

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
  const paginatedCandidates = filteredCandidates.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-gray-50 text-black">
      <Sidebar activeMenu="candidates" userRole="employer" userName={userName} userEmail={userEmail} />
      <div className="flex-1 p-4 lg:p-8 mt-20 lg:mt-0 lg:ml-72">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">Candidate Management</h1>
          <p className="text-gray-600 text-sm lg:text-base">Review and manage all job applications</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6 mb-4 lg:mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
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
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3F5357] bg-white"
            >
              <option value="all">All Status</option>
              {['pending', 'reviewing', 'shortlisted', 'rejected', 'hired'].map((status) => (
                <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>
              ))}
            </select>
            <select
              value={jobFilter}
              onChange={(e) => setJobFilter(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3F5357] bg-white"
            >
              <option value="all">All Jobs</option>
              {jobs.map(job => <option key={job.id} value={job.id.toString()}>{job.title}</option>)}
            </select>
          </div>
        </div>

        {/* Candidates Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3F5357]"></div></div>
          ) : filteredCandidates.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 font-medium">No candidates found</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Candidate</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Position</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Applied</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">AI Score</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedCandidates.map(candidate => (
                  <tr key={candidate.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{candidate.full_name}</div>
                      <div className="text-sm text-gray-500">{candidate.email}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{candidate.job_title}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(candidate.status)}`}>
                        {getStatusIcon(candidate.status)}
                        {candidate.status.charAt(0).toUpperCase() + candidate.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{new Date(candidate.applied_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{candidate.ai_score ?? 'N/A'}%</td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium flex gap-2 justify-end">
                      <button onClick={() => handleSendEmail(candidate)} className="p-2 hover:bg-blue-50 rounded-lg"><Send className="w-4 h-4 text-blue-600" /></button>
                      <button onClick={() => handleViewCandidate(candidate)} className="p-2 hover:bg-gray-100 rounded-lg"><Eye className="w-4 h-4 text-gray-600" /></button>
                      <button onClick={() => handleDeleteCandidate(candidate.id)} className="p-2 hover:bg-red-50 rounded-lg"><Trash className="w-4 h-4 text-red-600" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

{showViewModal && selectedCandidate && (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-40 p-4">
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
                <h3 className="text-lg font-bold text-indigo-900 mb-1">🤖 AI Match Analysis</h3>
                <p className="text-sm text-indigo-600">
                  Automated resume analysis and job fit assessment
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-indigo-900">{selectedCandidate.ai_score}%</div>
                <p className="text-xs text-indigo-600">Match Score</p>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-indigo-200 whitespace-pre-line">
              <p className="text-sm text-gray-700 leading-relaxed">
                {selectedCandidate.ai_feedback}
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  </div>
)}

        {totalPages > 1 && (
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-sm text-gray-600">Page {currentPage} of {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="px-3 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50">
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="px-3 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        

        {/* Email Composer */}
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
            onEmailSent={() => console.log('Email sent')}
          />
        )}
      </div>
    </div>
  );
}
