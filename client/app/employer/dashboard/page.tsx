// ============================================
// FILE: app/employer/dashboard/page.tsx
// ============================================
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Briefcase,
  Users,
  FileText,
  TrendingUp,
  ChevronRight,
} from 'lucide-react';
import Sidebar from '@/app/components/sidebar';
import { API_URL } from '@/app/config/constants';
interface Job {
  id: number;
  title: string;
  employment_type: string;
  status: string;
  created_at: string;
}

interface Application {
  id: number;
  job_id: number;
  applicant_name: string;
  applicant_email: string;
  ai_score: number;
  status: string;
  applied_at: string;
}

export default function EmployerDashboard() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [userName, setUserName] = useState('HR Manager');
  const [userEmail, setUserEmail] = useState('hr@company.com');
  const [loading, setLoading] = useState(true);

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

    loadData();
  }, []);

  const loadData = async () => {
    const token = localStorage.getItem('token');
    try {
      // Load jobs
      const jobsRes = await fetch(`${API_URL}/employer/jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const jobsData = await jobsRes.json();
      setJobs(jobsData);

      // Load all applications for all jobs
      const allApplications: Application[] = [];
      for (const job of jobsData) {
        const appsRes = await fetch(`${API_URL}/employer/jobs/${job.id}/applications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const appsData = await appsRes.json();
        allApplications.push(...appsData);
      }
      setApplications(allApplications);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getJobIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      'full-time': '💼',
      'part-time': '⏰',
      'contract': '📋',
      'Full-Time': '💼',
      'Part-Time': '⏰',
      'Contract': '📋',
    };
    return icons[type] || '💼';
  };

  const activeJobs = jobs.filter(job => job.status === 'active');
  const closedJobs = jobs.filter(job => job.status === 'closed');
  const pendingApplications = applications.filter(app => app.status === 'pending');
  const shortlistedApplications = applications.filter(app => app.status === 'shortlisted');
  const hiredApplications = applications.filter(app => app.status === 'hired');
  // Get recent jobs
  const recentOpenJobs = activeJobs.slice(0, 4);
  const recentClosedJobs = closedJobs.slice(0, 4);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3F5357]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar */}
      <Sidebar
        activeMenu="overview"
        userRole="employer"
        userName={userName}
        userEmail={userEmail}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-white">
        <div className="max-w-7xl mx-auto p-8">
          {/* Welcome Card */}
          <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl p-8 mb-8 shadow-lg">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Hi, {userName.split(' ')[0]}! 👋
            </h1>
            <p className="text-gray-600 text-lg">
              You have {activeJobs.length} active job{activeJobs.length !== 1 ? 's' : ''} today.
            </p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <StatCard
              icon={<Briefcase className="w-6 h-6" />}
              label="Active Jobs"
              value={activeJobs.length}
              color="from-blue-500 to-blue-600"
            />
            <StatCard
              icon={<FileText className="w-6 h-6" />}
              label="Total Applications"
              value={applications.length}
              color="from-green-500 to-green-600"
            />
            <StatCard
              icon={<Users className="w-6 h-6" />}
              label="Shortlisted"
              value={shortlistedApplications.length}
              color="from-purple-500 to-purple-600"
            />
            <StatCard
              icon={<TrendingUp className="w-6 h-6" />}
              label="Pending Review"
              value={pendingApplications.length}
              color="from-orange-500 to-orange-600"
            />
             <StatCard
              icon={<TrendingUp className="w-6 h-6" />}
              label="Hired"
              value={hiredApplications.length}
              color="from-green-500 to-green-600"
            />
          </div>

          {/* Your Open Jobs */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Open Jobs</h2>
            {recentOpenJobs.length === 0 ? (
              <div className="bg-white/95 rounded-3xl p-12 shadow-xl border border-gray-100 text-center">
                <p className="text-gray-500 mb-4">No active jobs yet</p>
                <button
                  onClick={() => router.push('/employer/jobs')}
                  className="px-6 py-3 bg-[#3F5357] hover:bg-[#344447] text-white rounded-lg transition-colors font-medium"
                >
                  Create Your First Job
                </button>
              </div>
            ) : (
              <div className="bg-white/95 rounded-3xl p-8 shadow-xl border border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {recentOpenJobs.map((job) => (
                    <JobCard
                      key={job.id}
                      icon={getJobIcon(job.employment_type)}
                      title={job.title}
                      type={job.employment_type}
                      candidates={`${applications.filter(app => app.job_id === job.id).length} Candidates`}
                      onClick={() => router.push(`/employer/jobs/`)}
                    />
                  ))}
                </div>
                {activeJobs.length > 4 && (
                  <div className="mt-6 text-center">
                    <button
                      onClick={() => router.push('/employer/jobs')}
                      className="text-[#3F5357] hover:text-[#2C2C2C] font-medium text-sm flex items-center gap-2 mx-auto"
                    >
                      View All Jobs
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Your Closed Jobs */}
          {closedJobs.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Closed Jobs</h2>
              <div className="bg-white/95 rounded-3xl p-8 shadow-xl border border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {recentClosedJobs.map((job) => (
                    <JobCard
                      key={job.id}
                      icon={getJobIcon(job.employment_type)}
                      title={job.title}
                      type={job.employment_type}
                      candidates={`${applications.filter(app => app.job_id === job.id).length} Candidates`}
                       onClick={() => router.push(`/employer/jobs/`)}
                      isClosed={true}
                    />
                  ))}
                </div>
                {closedJobs.length > 4 && (
                  <div className="mt-6 text-center">
                    <button
                      onClick={() => router.push('/employer/jobs')}
                      className="text-[#3F5357] hover:text-[#2C2C2C] font-medium text-sm flex items-center gap-2 mx-auto"
                    >
                      View All Closed Jobs
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <ActionCard
                title="Create Job Posting"
                description="Post a new job opening"
                icon="➕"
                onClick={() => router.push('/employer/jobs')}
              />
              <ActionCard
                title="Review Candidates"
                description="Check pending applications"
                icon="👥"
                onClick={() => router.push('/employer/candidates')}
              />
              <ActionCard
                title="View Analytics"
                description="Check hiring metrics"
                icon="📊"
                onClick={() => router.push('/employer/analytics')}
              />
            </div>
          </div>

          {/* Recent Applications */}
          {applications.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Recent Applications</h2>
                <button
                  onClick={() => router.push('/employer/candidates')}
                  className="text-sm text-[#3F5357] hover:text-[#2C2C2C] font-medium flex items-center gap-1"
                >
                  View All
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-[#d4dfe3]">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                        Candidate
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                        Job Position
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                        AI Score
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                        Applied
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {applications.slice(0, 5).map((app) => {
                      const job = jobs.find(j => j.id === app.job_id);
                      return (
                        <tr key={app.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {app.applicant_name}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {job?.title || 'N/A'}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-full max-w-[100px] bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    app.ai_score >= 70
                                      ? 'bg-green-500'
                                      : app.ai_score >= 50
                                      ? 'bg-yellow-500'
                                      : 'bg-red-500'
                                  }`}
                                  style={{ width: `${app.ai_score}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-gray-700">
                                {app.ai_score}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                app.status === 'shortlisted'
                                  ? 'bg-green-100 text-green-800'
                                  : app.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {app.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {new Date(app.applied_at).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Stat Card Component
function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl bg-gradient-to-br ${color} text-white shadow-lg`}>
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
      <p className="text-sm font-medium text-gray-600">{label}</p>
    </div>
  );
}

// Job Card Component
function JobCard({
  icon,
  title,
  type,
  candidates,
  onClick,
  isClosed = false,
}: {
  icon: string;
  title: string;
  type: string;
  candidates: string;
  onClick: () => void;
  isClosed?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center p-6 rounded-2xl transition-all group ${
        isClosed ? 'bg-gray-100 hover:bg-gray-200' : 'bg-gray-50 hover:bg-gray-100'
      }`}
    >
      <div className={`w-20 h-20 bg-white rounded-2xl flex items-center justify-center text-4xl mb-4 shadow-md group-hover:shadow-lg transition-shadow ${
        isClosed ? 'opacity-60' : ''
      }`}>
        {icon}
      </div>
      <h3 className="font-bold text-gray-900 mb-1 text-center">{title}</h3>
      <p className="text-sm text-gray-500 mb-2">{type}</p>
      <p className="text-sm font-semibold text-gray-900">{candidates}</p>
    </button>
  );
}

// Action Card Component
function ActionCard({
  title,
  description,
  icon,
  onClick,
}: {
  title: string;
  description: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-white/95 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all text-left group border border-gray-100"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-gradient-to-br from-[#3F5357] to-[#2C2C2C] rounded-xl flex items-center justify-center text-2xl shadow-lg">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-900 mb-1 group-hover:text-[#3F5357] transition-colors">
            {title}
          </h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#3F5357] group-hover:translate-x-1 transition-all" />
      </div>
    </button>
  );
}