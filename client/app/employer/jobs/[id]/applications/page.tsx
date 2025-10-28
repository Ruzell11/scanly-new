'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Sidebar from '@/app/components/sidebar';
import { API_URL } from '@/app/config/constants';
import { 
  ArrowLeft,
  Users, 
  Download,
  Mail,
  Calendar,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  FileText,
  Eye,
  X,
  AlertCircle
} from 'lucide-react';

interface Application {
  id: number;
  job_id: number;
  user_id: number;
  resume_url: string;
  cover_letter: string;
  status: string;
  applied_at: string;
  applicant_name: string;
  applicant_email: string;
  job_title: string;
}

interface Job {
  id: number;
  title: string;
  description: string;
  status: string;
}

interface Toast {
  message: string;
  type: 'success' | 'error';
}

export default function JobApplications() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.id as string;

  const [applications, setApplications] = useState<Application[]>([]);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('HR Manager');
  const [userEmail, setUserEmail] = useState('hr@company.com');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

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

    loadJobAndApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, statusFilter]);

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  const loadJobAndApplications = async () => {
    const token = localStorage.getItem('token');
    setLoading(true);

    try {
      // Load job details
      const jobRes = await fetch(`${API_URL}/employer/jobs/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (jobRes.ok) {
        const jobData = await jobRes.json();
        setJob(jobData);
      }

      // Load applications
      const searchParams = new URLSearchParams();
      if (statusFilter !== 'all') searchParams.append('status', statusFilter);

      const appRes = await fetch(`${API_URL}/employer/jobs/${jobId}/applications?${searchParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!appRes.ok) {
        throw new Error('Failed to load applications');
      }

      const data = await appRes.json();
      setApplications(data);
    } catch (err) {
      console.error('Error loading data', err);
      showToast('Failed to load applications', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (applicationId: number, newStatus: string) => {
    const token = localStorage.getItem('token');
    setIsUpdating(true);

    try {
      const res = await fetch(`${API_URL}/employer/applications/${applicationId}/status?status=${newStatus}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to update status');
      }

      // Update local state
      setApplications(applications.map(app => 
        app.id === applicationId ? { ...app, status: newStatus } : app
      ));

      if (selectedApplication?.id === applicationId) {
        setSelectedApplication({ ...selectedApplication, status: newStatus });
      }

      showToast('Application status updated successfully', 'success');
    } catch (err: any) {
      console.error('Error updating status', err);
      showToast(err.message || 'Failed to update status', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; dot: string }> = {
      pending: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
      shortlisted: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
      rejected: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
      hired: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
    };

    const badge = badges[status] || badges.pending;

    return (
      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getStatusCount = (status: string) => {
    return applications.filter(app => app.status === status).length;
  };

  const getResumeUrl = (resumePath: string) => {
    // If it's already a full URL, return as is
    if (resumePath.startsWith('http://') || resumePath.startsWith('https://')) {
      return resumePath;
    }
    // Otherwise, prepend the API_URL
    return `${API_URL}${resumePath.startsWith('/') ? '' : '/'}${resumePath}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4a6872]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar
        activeMenu="jobs"
        userRole="employer"
        userName={userName}
        userEmail={userEmail}
      />

      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-8">
          {/* Toast Notification */}
          {toast && (
            <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3 rounded-lg shadow-lg border ${
              toast.type === 'success' 
                ? 'bg-white border-green-500' 
                : 'bg-white border-red-500'
            }`}>
              {toast.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600" />
              )}
              <span className="font-medium text-gray-900">{toast.message}</span>
              <button onClick={() => setToast(null)} className="ml-2 hover:bg-gray-100 rounded p-1">
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          )}

          {/* Header */}
          <div className="mb-10">
            <button
              onClick={() => router.push('/employer/jobs')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm font-medium">Back to Jobs</span>
            </button>
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">
              Applications
            </h1>
            <p className="text-gray-500 text-sm">{job?.title || 'Loading...'}</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <p className="text-2xl font-semibold text-gray-900">{applications.length}</p>
              <p className="text-xs text-gray-500 mt-1">Total</p>
            </div>

            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <p className="text-2xl font-semibold text-gray-900">{getStatusCount('pending')}</p>
              <p className="text-xs text-gray-500 mt-1">Pending</p>
            </div>

            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <p className="text-2xl font-semibold text-gray-900">{getStatusCount('shortlisted')}</p>
              <p className="text-xs text-gray-500 mt-1">Shortlisted</p>
            </div>

            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <p className="text-2xl font-semibold text-gray-900">{getStatusCount('hired')}</p>
              <p className="text-xs text-gray-500 mt-1">Hired</p>
            </div>

            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <p className="text-2xl font-semibold text-gray-900">{getStatusCount('rejected')}</p>
              <p className="text-xs text-gray-500 mt-1">Rejected</p>
            </div>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-3 mb-6">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4a6872] bg-white"
            >
              <option value="all">All Applications</option>
              <option value="pending">Pending</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="hired">Hired</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Applications List */}
          <div className="space-y-3">
            {applications.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-900 font-medium">No applications found</p>
                <p className="text-gray-500 text-sm mt-1">
                  {statusFilter !== 'all' 
                    ? `No ${statusFilter} applications for this job`
                    : 'Applications will appear here once candidates apply'}
                </p>
              </div>
            ) : (
              applications.map((application) => (
                <div
                  key={application.id}
                  className="bg-white rounded-lg border border-gray-200 p-5 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-[#4a6872] rounded-full flex items-center justify-center text-white font-medium text-sm">
                          {application.applicant_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">
                            {application.applicant_name}
                          </h3>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {application.applicant_email}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(application.applied_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mb-3">
                        {getStatusBadge(application.status)}
                      </div>

                      {application.cover_letter && (
                        <p className="text-gray-600 text-xs line-clamp-2">
                          {application.cover_letter}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => {
                          setSelectedApplication(application);
                          setShowDetailModal(true);
                        }}
                        className="px-4 py-2 text-sm bg-[#4a6872] text-white rounded-lg hover:bg-[#3d5560] transition-colors font-medium"
                      >
                        View
                      </button>

                      {application.resume_url && (
                        <a
                          href={getResumeUrl(application.resume_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Resume
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Application Detail Modal */}
      {showDetailModal && selectedApplication && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              {/* Header */}
              <div className="flex items-start justify-between mb-8 pb-6 border-b border-gray-200">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-[#4a6872] rounded-full flex items-center justify-center text-white font-medium text-xl">
                    {selectedApplication.applicant_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {selectedApplication.applicant_name}
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">{selectedApplication.applicant_email}</p>
                  </div>
                </div>
                {getStatusBadge(selectedApplication.status)}
              </div>

              {/* Application Info */}
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Applying for</p>
                    <p className="text-sm font-medium text-gray-900">{job?.title || selectedApplication.job_title}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Applied Date</p>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(selectedApplication.applied_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                {/* Cover Letter */}
                {selectedApplication.cover_letter && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2">
                      Cover Letter
                    </h3>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {selectedApplication.cover_letter}
                      </p>
                    </div>
                  </div>
                )}

                {/* Resume */}
                {selectedApplication.resume_url && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2">
                      Resume
                    </h3>
                    <a
                      href={getResumeUrl(selectedApplication.resume_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-[#4a6872] text-white rounded-lg hover:bg-[#3d5560] transition-colors font-medium"
                    >
                      <Download className="w-4 h-4" />
                      Download Resume
                    </a>
                  </div>
                )}

                {/* Status Actions */}
                <div className="pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Update Status</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedApplication.status !== 'shortlisted' && (
                      <button
                        onClick={() => handleUpdateStatus(selectedApplication.id, 'shortlisted')}
                        disabled={isUpdating}
                        className="px-4 py-2.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
                      >
                        {isUpdating ? 'Updating...' : 'Shortlist'}
                      </button>
                    )}

                    {selectedApplication.status !== 'hired' && (
                      <button
                        onClick={() => handleUpdateStatus(selectedApplication.id, 'hired')}
                        disabled={isUpdating}
                        className="px-4 py-2.5 text-sm bg-[#4a6872] text-white rounded-lg hover:bg-[#3d5560] transition-colors font-medium disabled:opacity-50"
                      >
                        {isUpdating ? 'Updating...' : 'Hire'}
                      </button>
                    )}

                    {selectedApplication.status !== 'rejected' && (
                      <button
                        onClick={() => handleUpdateStatus(selectedApplication.id, 'rejected')}
                        disabled={isUpdating}
                        className="px-4 py-2.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
                      >
                        {isUpdating ? 'Updating...' : 'Reject'}
                      </button>
                    )}

                    {selectedApplication.status !== 'pending' && (
                      <button
                        onClick={() => handleUpdateStatus(selectedApplication.id, 'pending')}
                        disabled={isUpdating}
                        className="px-4 py-2.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
                      >
                        {isUpdating ? 'Updating...' : 'Set Pending'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <div className="flex justify-end mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}