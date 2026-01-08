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
  X,
  Link2
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
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;



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

  const totalPages = Math.ceil(jobs.length / ITEMS_PER_PAGE);

  const paginatedJobs = jobs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

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
      
      const method = isEditing ? 'PUT' : 'POST';

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
   <div className="min-h-screen bg-white flex flex-col lg:flex-row">
  {/* Sidebar */}
  <Sidebar
    activeMenu="jobs"
    userRole="employer"
    userName={userName}
    userEmail={userEmail}
  />

  {/* Main Content */}
  <main className="flex-1 overflow-auto bg-white mt-20 lg:mt-0 p-4 lg:p-8 lg:ml-72">
    {/* Toast */}
    {toast && (
      <div
        className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 sm:px-6 py-3 rounded-lg shadow-lg animate-slide-in ${
          toast.type === 'success'
            ? 'bg-green-500'
            : toast.type === 'error'
            ? 'bg-red-500'
            : 'bg-orange-500'
        } text-white text-sm sm:text-base`}
      >
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
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">💼 Job Openings</h1>
        <p className="text-gray-600 text-sm sm:text-base">
          Manage your job postings and track applications
        </p>
      </div>
      <button
        onClick={() => {
          resetForm();
          setShowModal(true);
        }}
        className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-[#3F5357] text-white rounded-xl hover:bg-[#2d3d42] transition-colors shadow-md text-sm sm:text-base"
      >
        <Plus className="w-4 sm:w-5 h-4 sm:h-5" />
        Post New Job
      </button>
    </div>

    {/* Suspended Jobs Warning */}
    {jobs.some(job => job.status === 'suspended') && (
      <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0" />
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
        <div className="text-center py-8 sm:py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
          <Briefcase className="w-12 sm:w-16 h-12 sm:h-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
          <p className="text-gray-600 text-base sm:text-lg mb-3 sm:mb-4">No job postings yet</p>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-[#3F5357] text-white rounded-lg hover:bg-[#2d3d42] transition-colors text-sm sm:text-base"
          >
            Create Your First Job
          </button>
        </div>
      ) : (
        paginatedJobs.map((job) => (
          <div
            key={job.id}
            className={`bg-white rounded-2xl shadow-sm border p-4 sm:p-6 hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:justify-between gap-4 sm:gap-6 ${
              job.status === 'suspended' ? 'border-orange-300 bg-orange-50/30' : 'border-gray-200'
            }`}
          >
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 mb-2 justify-between">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">{job.title}</h3>
                {getStatusBadge(job.status)}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mb-2">
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
                <div className="mt-2 flex items-center gap-2 text-sm text-orange-700">
                  <Ban className="w-4 h-4" />
                  <span className="font-medium text-xs sm:text-sm">
                    This job has been suspended by an administrator. Contact support for assistance.
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap sm:flex-col gap-2 sm:gap-3 ml-0 sm:ml-4">
              <button
                className={`p-2 rounded-lg transition-colors ${
                  job.status === 'active'
                    ? 'text-purple-600 hover:bg-purple-50'
                    : 'text-gray-400 hover:bg-gray-100'
                }`}
                title={job.status === 'active' ? 'Copy Public Job Link' : 'Job is not active'}
                onClick={() => {
                  if (job.status !== 'active') {
                    showToast('Job link is not available. Please activate the job first.', 'warning');
                    return;
                  }
                  const publicLink = `${window.location.origin}/apply/${job.id}`;
                  navigator.clipboard.writeText(publicLink);
                  showToast('Public job link copied', 'success');
                }}
              >
                <Link2 className="w-5 h-5" />
              </button>

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
        ))
      )}
    </div>

    {/* Pagination */}
    {jobs.length > ITEMS_PER_PAGE && (
      <div className="flex flex-wrap justify-center gap-2 mt-6 sm:mt-8">
        <button
          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          disabled={currentPage === 1}
          className={`px-3 py-1 sm:px-4 sm:py-2 rounded-lg border text-sm sm:text-base transition ${
            currentPage === 1
              ? 'text-gray-400 border-gray-200 cursor-not-allowed'
              : 'text-gray-700 border-gray-300 hover:bg-gray-100'
          }`}
        >
          Previous
        </button>

        {[...Array(totalPages)].map((_, index) => {
          const page = index + 1;
          return (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-1 sm:px-4 sm:py-2 rounded-lg border text-sm sm:text-base transition ${
                currentPage === page
                  ? 'bg-[#3F5357] text-white border-[#3F5357]'
                  : 'text-gray-700 border-gray-300 hover:bg-gray-100'
              }`}
            >
              {page}
            </button>
          );
        })}

        <button
          onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
          disabled={currentPage === totalPages}
          className={`px-3 py-1 sm:px-4 sm:py-2 rounded-lg border text-sm sm:text-base transition ${
            currentPage === totalPages
              ? 'text-gray-400 border-gray-200 cursor-not-allowed'
              : 'text-gray-700 border-gray-300 hover:bg-gray-100'
          }`}
        >
          Next
        </button>
      </div>
    )}
  </main>
</div>

  );
}