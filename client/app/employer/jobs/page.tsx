'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/app/components/sidebar';
import { API_URL } from '@/app/config/constants';
import { 
  Briefcase, 
  Plus, 
  Edit2, 
  Trash2, 
  Eye, 
  MapPin, 
  Calendar,
  Users,
  Ban,
  AlertCircle,
  X
} from 'lucide-react';

interface Job {
  id: number;
  title: string;
  description: string;
  requirements: string;
  employment_type: string;
  location: string;
  salary_range: string;
  status: string;
  created_at: string;
  company_id: number;
}

interface Toast {
  message: string;
  type: 'success' | 'error' | 'warning';
}

export default function EmployerJobs() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('HR Manager');
  const [userEmail, setUserEmail] = useState('hr@company.com');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingJobId, setEditingJobId] = useState<number | null>(null);
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState<Toast | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requirements: '',
    employment_type: 'full-time',
    location: '',
    salary_range: '',
    status: 'active',
  });

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

  // Auto-hide toast after 4 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error' | 'warning') => {
    setToast({ message, type });
  };

  const loadJobs = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/employer/jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setJobs(data);
    } catch (err) {
      console.error('Error loading jobs', err);
      showToast('Failed to load jobs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (job: Job) => {
    // Check if job is suspended
    if (job.status === 'suspended') {
      showToast('This job has been suspended by admin. Please contact support.', 'warning');
      return;
    }

    setFormData({
      title: job.title,
      description: job.description,
      requirements: job.requirements,
      employment_type: job.employment_type,
      location: job.location,
      salary_range: job.salary_range || '',
      status: job.status || 'active',
    });
    setEditingJobId(job.id);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    try {
      const url = isEditing
        ? `${API_URL}/employer/jobs/${editingJobId}`
        : `${API_URL}/employer/jobs`;
      
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to save job');
      }

      showToast(
        isEditing ? 'Job updated successfully' : 'Job created successfully',
        'success'
      );
      setShowModal(false);
      resetForm();
      loadJobs();
    } catch (err: any) {
      console.error('Error saving job', err);
      setFormError(err.message || 'Failed to save job');
      showToast(err.message || 'Failed to save job', 'error');
    }
  };

  const handleDelete = async (jobId: number) => {
    const job = jobs.find(j => j.id === jobId);
    
    if (job?.status === 'suspended') {
      showToast('Cannot delete suspended jobs. Please contact support.', 'warning');
      return;
    }

    if (!confirm('Are you sure you want to delete this job?')) return;

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/employer/jobs/${jobId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        showToast('Job deleted successfully', 'success');
        loadJobs();
      } else {
        throw new Error('Failed to delete job');
      }
    } catch (err) {
      console.error('Error deleting job', err);
      showToast('Failed to delete job', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      requirements: '',
      employment_type: 'full-time',
      location: '',
      salary_range: '',
      status: 'active',
    });
    setEditingJobId(null);
    setIsEditing(false);
    setFormError('');
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      active: { bg: 'bg-green-100', text: 'text-green-800', label: 'Active' },
      closed: { bg: 'bg-red-100', text: 'text-red-800', label: 'Closed' },
      draft: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Draft' },
      suspended: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Suspended by Admin' },
    };

    const badge = badges[status] || badges.draft;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {status === 'suspended' && <Ban className="w-3 h-3" />}
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3F5357]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar
        activeMenu="jobs"
        userRole="employer"
        userName={userName}
        userEmail={userEmail}
      />

      <main className="flex-1 overflow-auto bg-white">
        <div className="max-w-7xl mx-auto p-8">
          {/* Toast Notification */}
          {toast && (
            <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-6 py-4 rounded-lg shadow-lg animate-slide-in ${
              toast.type === 'success' ? 'bg-green-500' : 
              toast.type === 'error' ? 'bg-red-500' : 
              'bg-orange-500'
            } text-white`}>
              {toast.type === 'warning' && <AlertCircle className="w-5 h-5" />}
              <span className="font-medium">{toast.message}</span>
              <button
                onClick={() => setToast(null)}
                className="ml-2 hover:bg-white/20 rounded p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">💼 Job Openings</h1>
              <p className="text-gray-600">Manage your job postings and track applications</p>
            </div>
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="flex items-center gap-2 px-6 py-3 bg-[#3F5357] text-white rounded-xl hover:bg-[#2d3d42] transition-colors shadow-lg font-medium"
            >
              <Plus className="w-5 h-5" />
              Post New Job
            </button>
          </div>

          {/* Suspended Jobs Warning */}
          {jobs.some(job => job.status === 'suspended') && (
            <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-orange-900">Some jobs have been suspended</h3>
                <p className="text-sm text-orange-700 mt-1">
                  Jobs marked as "Suspended by Admin" cannot be edited or deleted. 
                  Please contact support if you believe this is an error.
                </p>
              </div>
            </div>
          )}

          {/* Jobs List */}
          <div className="space-y-4">
            {jobs.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
                <Briefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg mb-4">No job postings yet</p>
                <button
                  onClick={() => {
                    resetForm();
                    setShowModal(true);
                  }}
                  className="px-6 py-3 bg-[#3F5357] text-white rounded-lg hover:bg-[#2d3d42] transition-colors font-medium"
                >
                  Create Your First Job
                </button>
              </div>
            ) : (
              jobs.map((job) => (
                <div
                  key={job.id}
                  className={`bg-white rounded-2xl shadow-sm border p-6 hover:shadow-md transition-shadow ${
                    job.status === 'suspended' 
                      ? 'border-orange-300 bg-orange-50/30' 
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900">{job.title}</h3>
                        {getStatusBadge(job.status)}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span>{job.location}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Briefcase className="w-4 h-4" />
                          <span className="capitalize">{job.employment_type.replace('-', ' ')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(job.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <p className="text-gray-600 text-sm line-clamp-2">{job.description}</p>
                      
                      {job.status === 'suspended' && (
                        <div className="mt-3 flex items-center gap-2 text-sm text-orange-700">
                          <Ban className="w-4 h-4" />
                          <span className="font-medium">
                            This job has been suspended by an administrator. Contact support for assistance.
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => router.push(`/employer/jobs/${job.id}/applications`)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Applications"
                      >
                        <Users className="w-5 h-5" />
                      </button>

                      <button
                        onClick={() => handleEdit(job)}
                        disabled={job.status === 'suspended'}
                        className={`p-2 rounded-lg transition-colors ${
                          job.status === 'suspended'
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                        title={job.status === 'suspended' ? 'Cannot edit suspended job' : 'Edit Job'}
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>

                      <button
                        onClick={() => handleDelete(job.id)}
                        disabled={job.status === 'suspended'}
                        className={`p-2 rounded-lg transition-colors ${
                          job.status === 'suspended'
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-red-600 hover:bg-red-50'
                        }`}
                        title={job.status === 'suspended' ? 'Cannot delete suspended job' : 'Delete Job'}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Create/Edit Modal */}
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

                {/* Job Status - Only show when editing and NOT suspended */}
                {isEditing && formData.status !== 'suspended' && (
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">
                      Job Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-4 py-3 bg-[#3d5a62] border border-[#4a6872] rounded-lg text-white focus:outline-none focus:border-[#5a7882]"
                    >
                      <option value="active">Active</option>
                      <option value="closed">Closed</option>
                      <option value="draft">Draft</option>
                    </select>
                    <p className="mt-2 text-xs text-white/60">
                      {formData.status === 'active' && '✓ Job is visible to applicants'}
                      {formData.status === 'closed' && '✗ Job is closed and not accepting applications'}
                      {formData.status === 'draft' && '📝 Job is saved as draft'}
                    </p>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setFormError('');
                      setIsEditing(false);
                      resetForm();
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
    </div>
  );
}