// ============================================
// FILE: app/employer/jobs/page.tsx
// ============================================
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  Trash2,
  Search,
  Edit,
  Link as LinkIcon,
  Copy,
  Check,
} from 'lucide-react';
import Sidebar from '@/app/components/sidebar';
import { API_URL } from '@/app/config/constants';
interface Job {
  id: number;
  title: string;
  description: string;
  requirements: string;
  location: string;
  salary_range?: string;
  employment_type: string;
  status: string;
  company_id: number;
  created_by: number;
  apply_link?: string;
  created_at: string;
}

export default function EmployerJobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [userName, setUserName] = useState('HR Manager');
  const [userEmail, setUserEmail] = useState('hr@company.com');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedJobId, setCopiedJobId] = useState<number | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requirements: '',
    location: '',
    salary_range: '',
    employment_type: 'full-time',
  });
  const [formError, setFormError] = useState('');

  const itemsPerPage = 10;

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token) {
      router.push('/login');
      return;
    }

    if (user) {
      const userData = JSON.parse(user);
      setUserName(userData.full_name || 'HR Manager');
      setUserEmail(userData.email || 'hr@company.com');
    }

    loadJobs();
  }, []);

  const loadJobs = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/employer/jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setJobs(data);
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const token = localStorage.getItem('token');
    
    try {
      const url = isEditing && selectedJob 
        ? `${API_URL}/employer/jobs/${selectedJob.id}`
        : `${API_URL}/employer/jobs`;
      
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to ${isEditing ? 'update' : 'create'} job`);
      }

      setShowModal(false);
      setIsEditing(false);
      loadJobs();
      setFormData({
        title: '',
        description: '',
        requirements: '',
        location: '',
        salary_range: '',
        employment_type: 'full-time',
      });
    } catch (error: any) {
      setFormError(error.message);
    }
  };

  const handleDeleteJob = async (id: number) => {
    if (!confirm('Are you sure you want to delete this job?')) return;
    
    const token = localStorage.getItem('token');
    try {
      await fetch(`${API_URL}/employer/jobs/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setShowViewModal(false);
      loadJobs();
    } catch (error) {
      console.error('Error deleting job:', error);
    }
  };

  const handleViewJob = (job: Job) => {
    setSelectedJob(job);
    setShowViewModal(true);
  };

  const handleEditJob = (job: Job) => {
    setSelectedJob(job);
    setFormData({
      title: job.title,
      description: job.description,
      requirements: job.requirements,
      location: job.location,
      salary_range: job.salary_range || '',
      employment_type: job.employment_type,
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleCopyLink = async (job: Job) => {
    if (!job.apply_link) return;
    
    try {
      await navigator.clipboard.writeText(job.apply_link);
      setCopiedJobId(job.id);
      setTimeout(() => setCopiedJobId(null), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const totalPages = Math.ceil(jobs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  
  // Filter jobs based on search query
  const filteredJobs = jobs.filter(job => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      job.title.toLowerCase().includes(query) ||
      job.employment_type.toLowerCase().includes(query) ||
      job.location.toLowerCase().includes(query)
    );
  });
  
  const paginatedJobs = filteredJobs.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3F5357]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex">
      {/* Sidebar */}
      <Sidebar
        activeMenu="jobs"
        userRole="employer"
        userName={userName}
        userEmail={userEmail}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-white">
        <div className="p-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
            <span>Job Lists</span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900 font-medium">Open Positions</span>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Open Positions</h1>
            <button
              onClick={() => {
                setIsEditing(false);
                setFormData({
                  title: '',
                  description: '',
                  requirements: '',
                  location: '',
                  salary_range: '',
                  employment_type: 'full-time',
                });
                setShowModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#3F5357] hover:bg-[#344447] text-white rounded-lg transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add New Position
            </button>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title, type, or location..."
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
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#d4dfe3]">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Job Position
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Job Type
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedJobs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                      No jobs found. Create your first job posting to get started.
                    </td>
                  </tr>
                ) : (
                  paginatedJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-gray-300"
                          />
                          <span className="text-sm font-medium text-gray-900">
                            {job.title}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {job.employment_type}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          job.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {job.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleViewJob(job)}
                            className="text-sm text-[#3F5357] hover:text-[#2C2C2C] font-medium"
                          >
                            Quick view
                          </button>
                          <button
                            onClick={() => handleCopyLink(job)}
                            className={`p-1 transition-colors ${
                              copiedJobId === job.id
                                ? 'text-green-600'
                                : 'text-[#3F5357] hover:text-[#2C2C2C]'
                            }`}
                            title="Copy application link"
                          >
                            {copiedJobId === job.id ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <LinkIcon className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleEditJob(job)}
                            className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteJob(job.id)}
                            className="p-1 text-red-600 hover:text-red-800 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Create/Edit Job Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#2d4a52] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">
                  {isEditing ? 'Edit Job Opening' : 'Create a New Job Opening'}
                </h2>
                <p className="text-white/60 text-sm">
                  Provide clear and effective details to hire talents
                </p>
              </div>

              <form onSubmit={handleCreateJob} className="space-y-6">
                {formError && (
                  <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                    {formError}
                  </div>
                )}

                {/* Job Position */}
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Job Position
                  </label>
                  <input
                    type="text"
                    placeholder="E.g Software Engineer"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-3 bg-[#3d5a62] border border-[#4a6872] rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-[#5a7882]"
                  />
                </div>

                {/* Job Description */}
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Job Description
                    <span className="float-right text-white/60">{formData.description.length}/1500</span>
                  </label>
                  <textarea
                    placeholder="Use text points to highlight key responsibilities and requirements"
                    required
                    rows={5}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    maxLength={1500}
                    className="w-full px-4 py-3 bg-[#3d5a62] border border-[#4a6872] rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-[#5a7882] resize-none"
                  />
                </div>

                {/* Requirements */}
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Requirements
                  </label>
                  <textarea
                    placeholder="List the key requirements and qualifications"
                    required
                    rows={3}
                    value={formData.requirements}
                    onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                    className="w-full px-4 py-3 bg-[#3d5a62] border border-[#4a6872] rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-[#5a7882] resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Employment Type */}
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">
                      Employment Type
                    </label>
                    <select
                      value={formData.employment_type}
                      onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                      className="w-full px-4 py-3 bg-[#3d5a62] border border-[#4a6872] rounded-lg text-white focus:outline-none focus:border-[#5a7882]"
                    >
                      <option value="full-time">Full-Time</option>
                      <option value="part-time">Part-Time</option>
                      <option value="contract">Contract</option>
                    </select>
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">
                      Location
                    </label>
                    <input
                      type="text"
                      placeholder="E.g Remote, New York"
                      required
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-4 py-3 bg-[#3d5a62] border border-[#4a6872] rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-[#5a7882]"
                    />
                  </div>
                </div>

                {/* Salary Range */}
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Salary Range (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="E.g $80k - $120k"
                    value={formData.salary_range}
                    onChange={(e) => setFormData({ ...formData, salary_range: e.target.value })}
                    className="w-full px-4 py-3 bg-[#3d5a62] border border-[#4a6872] rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-[#5a7882]"
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setFormError('');
                      setIsEditing(false);
                    }}
                    className="flex-1 px-6 py-3 bg-transparent border border-white/20 text-white rounded-lg hover:bg-white/10 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-[#4a9eff] hover:bg-[#3d8ae6] text-white rounded-lg transition-colors font-medium"
                  >
                    {isEditing ? 'Update' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Quick View Modal */}
      {showViewModal && selectedJob && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">
                    Job Details
                  </h2>
                  <p className="text-gray-500 text-sm">
                    View job posting information
                  </p>
                </div>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Job Info */}
              <div className="space-y-6">
                {/* Title */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <label className="block text-sm font-medium text-gray-500 mb-2">
                    Job Title
                  </label>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedJob.title}
                  </p>
                </div>

                {/* Description */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <label className="block text-sm font-medium text-gray-500 mb-2">
                    Description
                  </label>
                  <p className="text-base text-gray-700 leading-relaxed whitespace-pre-line">
                    {selectedJob.description}
                  </p>
                </div>

                {/* Requirements */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <label className="block text-sm font-medium text-gray-500 mb-2">
                    Requirements
                  </label>
                  <p className="text-base text-gray-700 leading-relaxed whitespace-pre-line">
                    {selectedJob.requirements}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Employment Type */}
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <label className="block text-sm font-medium text-gray-500 mb-2">
                      Employment Type
                    </label>
                    <p className="text-base text-gray-900 capitalize">
                      {selectedJob.employment_type}
                    </p>
                  </div>

                  {/* Location */}
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <label className="block text-sm font-medium text-gray-500 mb-2">
                      Location
                    </label>
                    <p className="text-base text-gray-900">
                      {selectedJob.location}
                    </p>
                  </div>
                </div>

                {/* Salary Range */}
                {selectedJob.salary_range && (
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <label className="block text-sm font-medium text-gray-500 mb-2">
                      Salary Range
                    </label>
                    <p className="text-base text-gray-900">
                      {selectedJob.salary_range}
                    </p>
                  </div>
                )}

                {/* Apply Link */}
                {selectedJob.apply_link && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-blue-200">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <label className="block text-sm font-medium text-blue-900 mb-1">
                          📋 Application Link
                        </label>
                        <p className="text-xs text-blue-600">
                          Share this link for candidates to apply. AI will automatically analyze their resumes.
                        </p>
                      </div>
                      <button
                        onClick={() => handleCopyLink(selectedJob)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                          copiedJobId === selectedJob.id
                            ? 'bg-green-600 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {copiedJobId === selectedJob.id ? (
                          <>
                            <Check className="w-4 h-4" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copy Link
                          </>
                        )}
                      </button>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-blue-200">
                      <code className="text-sm text-blue-900 break-all font-mono">
                        {selectedJob.apply_link}
                      </code>
                    </div>
                  </div>
                )}

                {/* Status & Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <label className="block text-sm font-medium text-gray-500 mb-2">
                      Status
                    </label>
                    <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                      selectedJob.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedJob.status}
                    </span>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <label className="block text-sm font-medium text-gray-500 mb-2">
                      Created Date
                    </label>
                    <p className="text-base text-gray-900">
                      {new Date(selectedJob.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-colors font-medium"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    handleEditJob(selectedJob);
                  }}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit Job
                </button>
                <button
                  onClick={() => handleDeleteJob(selectedJob.id)}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}