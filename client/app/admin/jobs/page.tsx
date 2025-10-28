'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/app/components/sidebar';
import { API_URL } from '@/app/config/constants';
import { 
  Briefcase, 
  Search, 
  Filter, 
  Building2, 
  MapPin, 
  Calendar, 
  Users,
  CheckCircle,
  XCircle,
  FileText,
  AlertCircle,
  Eye,
  Ban
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
  company_name: string;
  application_count: number;
}

interface Company {
  id: number;
  name: string;
}

export default function AdminJobs() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
   const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('Admin');
  const [userEmail, setUserEmail] = useState('admin@company.com');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // View job modal
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showJobModal, setShowJobModal] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (!token) {
      router.push('/login');
      return;
    }

    if (user) {
      const userData = JSON.parse(user);
      setUserName(userData.full_name || 'Admin');
      setUserEmail(userData.email || 'admin@company.com');
    }

    loadData();
  }, [statusFilter, companyFilter]);

  const loadData = async () => {
    const token = localStorage.getItem('token');
    setLoading(true);

    try {
      // Build query params
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (companyFilter !== 'all') params.append('company_id', companyFilter);

      const jobsRes = await fetch(`${API_URL}/admin/jobs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const jobsData = await jobsRes.json();
      setJobs(jobsData);

      // Load companies for filter
      const companiesRes = await fetch(`${API_URL}/admin/companies`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const companiesData = await companiesRes.json();
      setCompanies(companiesData);
    } catch (err) {
      console.error('Error loading jobs', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadData();
      return;
    }

    const token = localStorage.getItem('token');
    try {
      const params = new URLSearchParams();
      params.append('search', searchQuery);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (companyFilter !== 'all') params.append('company_id', companyFilter);

      const res = await fetch(`${API_URL}/admin/jobs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setJobs(data);
    } catch (err) {
      console.error('Error searching jobs', err);
    }
  };

 const handleUpdateStatus = async (jobId: number, newStatus: string) => {
  const token = localStorage.getItem('token');
  setIsUpdating(true);
  
  try {
    const res = await fetch(`${API_URL}/admin/jobs/${jobId}/status?status=${newStatus}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.detail || 'Failed to update job status');
    }

    const data = await res.json();
    
    // Update local state
    setJobs(jobs.map(job => 
      job.id === jobId ? { ...job, status: newStatus } : job
    ));
    
    if (selectedJob?.id === jobId) {
      setSelectedJob({ ...selectedJob, status: newStatus });
    }
    
    alert(data.message || 'Job status updated successfully');
  } catch (err: any) {
    console.error('Error updating job status', err);
    alert(err.message || 'Failed to update job status');
  } finally {
    setIsUpdating(false);
  }
};

  const getStatusBadge = (status: string) => {
    const badges = {
      active: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      closed: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
      draft: { bg: 'bg-gray-100', text: 'text-gray-800', icon: FileText },
      suspended: { bg: 'bg-orange-100', text: 'text-orange-800', icon: Ban },
    };

    const badge = badges[status as keyof typeof badges] || badges.draft;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const filteredJobs = jobs;

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3F5357]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex text-black">
      <Sidebar
        activeMenu="jobs"
        userRole="admin"
        userName={userName}
        userEmail={userEmail}
      />

      <main className="flex-1 overflow-auto bg-white">
        <div className="max-w-7xl mx-auto p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">💼 All Jobs</h1>
            <p className="text-gray-600">Monitor and manage all job postings across the platform</p>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search jobs by title or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3F5357]"
                />
              </div>

              <button
                onClick={handleSearch}
                className="px-6 py-3 bg-[#3F5357] text-white rounded-lg hover:bg-[#2d3d42] transition-colors font-medium"
              >
                Search
              </button>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center gap-2"
              >
                <Filter className="w-5 h-5" />
                Filters
              </button>
            </div>

            {/* Filter Options */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3F5357]"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="closed">Closed</option>
                    <option value="draft">Draft</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Company</label>
                  <select
                    value={companyFilter}
                    onChange={(e) => setCompanyFilter(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3F5357]"
                  >
                    <option value="all">All Companies</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <Briefcase className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{jobs.length}</p>
              <p className="text-sm text-gray-600">Total Jobs</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {jobs.filter((j) => j.status === 'active').length}
              </p>
              <p className="text-sm text-gray-600">Active Jobs</p>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border border-red-200">
              <div className="flex items-center justify-between mb-2">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {jobs.filter((j) => j.status === 'closed').length}
              </p>
              <p className="text-sm text-gray-600">Closed Jobs</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-8 h-8 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {jobs.reduce((sum, job) => sum + job.application_count, 0)}
              </p>
              <p className="text-sm text-gray-600">Total Applications</p>
            </div>
          </div>

          {/* Jobs List */}
          <div className="space-y-4">
            {filteredJobs.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
                <Briefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">No jobs found</p>
              </div>
            ) : (
              filteredJobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-semibold text-gray-900">{job.title}</h3>
                            {getStatusBadge(job.status)}
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                            <div className="flex items-center gap-1">
                              <Building2 className="w-4 h-4" />
                              <span className="font-medium">{job.company_name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              <span>{job.location}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Briefcase className="w-4 h-4" />
                              <span className="capitalize">{job.employment_type.replace('-', ' ')}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              <span>{job.application_count} applications</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>{new Date(job.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>

                          <p className="text-gray-600 text-sm line-clamp-2">{job.description}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => {
                          setSelectedJob(job);
                          setShowJobModal(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-5 h-5" />
                      </button>

                      {job.status !== 'suspended' && (
                        <button
                          onClick={() => handleUpdateStatus(job.id, 'suspended')}
                          className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          title="Suspend Job"
                        >
                          <Ban className="w-5 h-5" />
                        </button>
                      )}

                      {job.status === 'suspended' && (
                        <button
                          onClick={() => handleUpdateStatus(job.id, 'active')}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Reactivate Job"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Job Details Modal */}
      {showJobModal && selectedJob && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedJob.title}</h2>
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-gray-600" />
                    <span className="text-gray-700 font-medium">{selectedJob.company_name}</span>
                  </div>
                </div>
                {getStatusBadge(selectedJob.status)}
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Job Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Location:</span>
                      <span className="ml-2 font-medium">{selectedJob.location}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Type:</span>
                      <span className="ml-2 font-medium capitalize">
                        {selectedJob.employment_type.replace('-', ' ')}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Salary:</span>
                      <span className="ml-2 font-medium">
                        {selectedJob.salary_range || 'Not specified'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Applications:</span>
                      <span className="ml-2 font-medium">{selectedJob.application_count}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Posted:</span>
                      <span className="ml-2 font-medium">
                        {new Date(selectedJob.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Company ID:</span>
                      <span className="ml-2 font-medium">{selectedJob.company_id}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedJob.description}</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Requirements</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedJob.requirements}</p>
                </div>

                {/* Admin Actions */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Admin Actions</h3>
                  <div className="flex gap-3">
                    {selectedJob.status !== 'active' && (
                      <button
                        onClick={() => handleUpdateStatus(selectedJob.id, 'active')}
                        className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Activate
                      </button>
                    )}

                    {selectedJob.status !== 'closed' && (
                      <button
                        onClick={() => handleUpdateStatus(selectedJob.id, 'closed')}
                        className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        Close
                      </button>
                    )}

                    {selectedJob.status !== 'suspended' && (
                      <button
                        onClick={() => handleUpdateStatus(selectedJob.id, 'suspended')}
                        className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium flex items-center justify-center gap-2"
                      >
                        <Ban className="w-4 h-4" />
                        Suspend
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowJobModal(false)}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
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