'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import Sidebar from '@/app/components/sidebar';
import { API_URL } from '@/app/config/constants';
import { Users, FileText, TrendingUp, Briefcase, CheckCircle, Clock } from 'lucide-react';

interface Job {
  id: number;
  title: string;
  status: string;
  created_at: string;
}

interface Application {
  id: number;
  status: string;
  applied_at: string;
}

export default function EmployerAnalytics() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('HR Manager');
  const [userEmail, setUserEmail] = useState('hr@company.com');

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
      const jobsRes = await fetch(`${API_URL}/employer/jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const jobsData = await jobsRes.json();
      setJobs(jobsData);

      const allApplications: Application[] = [];
      for (const job of jobsData) {
        const appsRes = await fetch(`${API_URL}/employer/jobs/${job.id}/applications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const appsData = await appsRes.json();
        allApplications.push(...appsData);
      }
      setApplications(allApplications);
    } catch (err) {
      console.error('Error loading analytics data', err);
    } finally {
      setLoading(false);
    }
  };

  // Job Status Aggregates
  const activeJobs = jobs.filter(j => j.status === 'active').length;
  const closedJobs = jobs.filter(j => j.status === 'closed').length;
  const draftJobs = jobs.filter(j => j.status === 'draft').length;

  // Application Status Aggregates
  const hiredCount = applications.filter(a => a.status === 'hired').length;
  const shortlistedCount = applications.filter(a => a.status === 'shortlisted').length;
  const pendingCount = applications.filter(a => a.status === 'pending').length;
  const rejectedCount = applications.filter(a => a.status === 'rejected').length;
  
  const totalJobs = jobs.length;
  const totalApplications = applications.length;

  // Application Status Chart Data
  const applicationPieData = [
    { name: 'Hired', value: hiredCount },
    { name: 'Shortlisted', value: shortlistedCount },
    { name: 'Pending', value: pendingCount },
    { name: 'Rejected', value: rejectedCount },
  ].filter(item => item.value > 0);

  const APPLICATION_COLORS = ['#22c55e', '#a855f7', '#f59e0b', '#ef4444'];

  // Job Status Chart Data
  const jobStatusPieData = [
    { name: 'Active', value: activeJobs },
    { name: 'Closed', value: closedJobs },
    { name: 'Draft', value: draftJobs },
  ].filter(item => item.value > 0);

  const JOB_STATUS_COLORS = ['#22c55e', '#ef4444', '#94a3b8'];

  // Job Posting Trends (Monthly)
  const barData = jobs.reduce((acc: Record<string, number>, job) => {
    const month = new Date(job.created_at).toLocaleString('default', { month: 'short' });
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {});
  const barChartData = Object.entries(barData).map(([month, count]) => ({ month, count }));

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
        activeMenu="analytics"
        userRole="employer"
        userName={userName}
        userEmail={userEmail}
      />

      <main className="flex-1 overflow-auto bg-white lg:ml-72">
        <div className="max-w-7xl mx-auto p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">📊 Employer Analytics</h1>
          <p className="text-gray-600 mb-10">
            Analyze your hiring performance and application trends.
          </p>

          {/* Overview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-12">
            <StatCard 
              icon={<Briefcase className="w-6 h-6" />} 
              label="Total Jobs" 
              value={totalJobs} 
              color="from-blue-500 to-blue-600" 
            />
            <StatCard 
              icon={<CheckCircle className="w-6 h-6" />} 
              label="Active Jobs" 
              value={activeJobs} 
              color="from-green-500 to-green-600" 
            />
            <StatCard 
              icon={<FileText className="w-6 h-6" />} 
              label="Total Applications" 
              value={totalApplications} 
              color="from-purple-500 to-purple-600" 
            />
            <StatCard 
              icon={<Users className="w-6 h-6" />} 
              label="Shortlisted" 
              value={shortlistedCount} 
              color="from-indigo-500 to-indigo-600" 
            />
            <StatCard 
              icon={<TrendingUp className="w-6 h-6" />} 
              label="Hired" 
              value={hiredCount} 
              color="from-teal-500 to-teal-600" 
            />
            <StatCard 
              icon={<Clock className="w-6 h-6" />} 
              label="Pending" 
              value={pendingCount} 
              color="from-amber-500 to-amber-600" 
            />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mb-10">
            {/* Application Status Pie Chart */}
            <div className="bg-white/95 rounded-3xl p-8 shadow-lg border border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Application Status</h2>
              {applicationPieData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={applicationPieData} 
                        cx="50%" 
                        cy="50%" 
                        outerRadius={80} 
                        label
                        dataKey="value"
                      >
                        {applicationPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={APPLICATION_COLORS[index % APPLICATION_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  No applications yet
                </div>
              )}
            </div>

            {/* Job Status Pie Chart */}
            <div className="bg-white/95 rounded-3xl p-8 shadow-lg border border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Job Status</h2>
              {jobStatusPieData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={jobStatusPieData} 
                        cx="50%" 
                        cy="50%" 
                        outerRadius={80} 
                        label
                        dataKey="value"
                      >
                        {jobStatusPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={JOB_STATUS_COLORS[index % JOB_STATUS_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  No jobs posted yet
                </div>
              )}
            </div>

            {/* Hiring Metrics */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl p-8 shadow-lg border border-green-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Hiring Metrics</h3>
              <div className="space-y-4">
                <MetricRow 
                  label="Hire Rate" 
                  value={`${totalApplications > 0 ? ((hiredCount / totalApplications) * 100).toFixed(1) : 0}%`} 
                />
                <MetricRow 
                  label="Avg Apps/Job" 
                  value={totalJobs > 0 ? (totalApplications / totalJobs).toFixed(1) : '0'} 
                />
                <MetricRow 
                  label="Active Job Rate" 
                  value={`${totalJobs > 0 ? ((activeJobs / totalJobs) * 100).toFixed(0) : 0}%`} 
                />
              </div>
            </div>
          </div>

          {/* Job Posting Trends */}
          {barChartData.length > 0 && (
            <div className="bg-white/95 rounded-3xl p-8 shadow-lg border border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Job Posting Trends</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3F5357" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Reusable StatCard
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

// Metric Row Component
function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-lg font-semibold text-gray-900">{value}</span>
    </div>
  );
}