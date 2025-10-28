'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import Sidebar from '@/app/components/sidebar';
import { API_URL } from '@/app/config/constants';
import { Users, FileText, TrendingUp, Briefcase, Building2, CheckCircle, XCircle, LucideFileWarning } from 'lucide-react';

interface DashboardAnalytics {
  total_companies: number;
  total_users: number;
  total_jobs: number;
  total_applications: number;
  active_jobs: number;
  closed_jobs: number;
  pending_applications: number;
    suspended_jobs: number;
}

export default function AdminAnalytics() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('Admin');
  const [userEmail, setUserEmail] = useState('admin@company.com');

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
  }, []);

  const loadData = async () => {
    const token = localStorage.getItem('token');
    
    try {
      const analyticsRes = await fetch(`${API_URL}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const analyticsData = await analyticsRes.json();
      setAnalytics(analyticsData);
    } catch (err) {
      console.error('Error loading analytics data', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3F5357]"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-600">Failed to load analytics data</p>
      </div>
    );
  }

  // Application Status Data - showing pending vs processed
  const processedApplications = analytics.total_applications - analytics.pending_applications;
  const applicationPieData = [
    { name: 'Processed', value: processedApplications },
    { name: 'Pending', value: analytics.pending_applications },
  ].filter(item => item.value > 0);

  const APPLICATION_COLORS = ['#22c55e', '#f59e0b'];

  // Job Status Data - showing active vs closed
  const draftJobs = analytics.total_jobs - analytics.active_jobs - analytics.closed_jobs;
  const jobStatusPieData = [
    { name: 'Active', value: analytics.active_jobs },
    { name: 'Closed', value: analytics.closed_jobs },
    { name: 'Draft', value: draftJobs },
  ].filter(item => item.value > 0);

  const JOB_STATUS_COLORS = ['#22c55e', '#ef4444', '#94a3b8'];

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar
        activeMenu="analytics"
        userRole="admin"
        userName={userName}
        userEmail={userEmail}
      />
      <main className="flex-1 overflow-auto bg-white">
        <div className="max-w-7xl mx-auto p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">📊 Admin Analytics Dashboard</h1>
          <p className="text-gray-600 mb-10">
            Monitor platform-wide metrics and performance indicators.
          </p>

          {/* Overview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-3 gap-6 mb-12">
            <StatCard 
              icon={<Building2 className="w-6 h-6" />} 
              label="Total Companies" 
              value={analytics.total_companies} 
              color="from-blue-500 to-blue-600" 
            />
            <StatCard 
              icon={<Users className="w-6 h-6" />} 
              label="Total Users" 
              value={analytics.total_users} 
              color="from-green-500 to-green-600" 
            />
            <StatCard 
              icon={<Briefcase className="w-6 h-6" />} 
              label="Total Jobs" 
              value={analytics.total_jobs} 
              color="from-purple-500 to-purple-600" 
            />
            <StatCard 
              icon={<CheckCircle className="w-6 h-6" />} 
              label="Active Jobs" 
              value={analytics.active_jobs} 
              color="from-teal-500 to-teal-600" 
            />
                <StatCard 
              icon={<LucideFileWarning className="w-6 h-6" />} 
              label="Suspended Jobs" 
              value={analytics.suspended_jobs} 
              color="from-amber-500 to-amber-600" 
            />
            <StatCard 
              icon={<XCircle className="w-6 h-6" />} 
              label="Closed Jobs" 
              value={analytics.closed_jobs} 
              color="from-red-500 to-red-600" 
            />
            
            <StatCard 
              icon={<FileText className="w-6 h-6" />} 
              label="Total Applications" 
              value={analytics.total_applications} 
              color="from-orange-500 to-orange-600" 
            />
            <StatCard 
              icon={<TrendingUp className="w-6 h-6" />} 
              label="Pending Applications" 
              value={analytics.pending_applications} 
              color="from-amber-500 to-amber-600" 
            />
           
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
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
                  No application data available
                </div>
              )}
            </div>

            {/* Job Status Pie Chart */}
            <div className="bg-white/95 rounded-3xl p-8 shadow-lg border border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Job Status Distribution</h2>
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
                  No job data available
                </div>
              )}
            </div>

            {/* Platform Health */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-8 shadow-lg border border-blue-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Platform Health</h3>
              <div className="space-y-4">
                <MetricRow 
                  label="Active Job Rate" 
                  value={`${analytics.total_jobs > 0 ? ((analytics.active_jobs / analytics.total_jobs) * 100).toFixed(1) : 0}%`} 
                />
                <MetricRow 
                  label="Closed Job Rate" 
                  value={`${analytics.total_jobs > 0 ? ((analytics.closed_jobs / analytics.total_jobs) * 100).toFixed(1) : 0}%`} 
                />
                <MetricRow 
                  label="Avg Applications/Job" 
                  value={analytics.total_jobs > 0 ? (analytics.total_applications / analytics.total_jobs).toFixed(1) : '0'} 
                />
              </div>
            </div>
          </div>

          {/* Bottom Row - User Engagement */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mt-10">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl p-8 shadow-lg border border-green-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">User Engagement</h3>
              <div className="space-y-4">
                <MetricRow 
                  label="Avg Users/Company" 
                  value={analytics.total_companies > 0 ? (analytics.total_users / analytics.total_companies).toFixed(1) : '0'} 
                />
                <MetricRow 
                  label="Companies with Jobs" 
                  value={`${analytics.total_companies > 0 ? ((analytics.total_jobs / analytics.total_companies) * 100).toFixed(0) : 0}%`} 
                />
                <MetricRow 
                  label="Application Processing Rate" 
                  value={`${analytics.total_applications > 0 ? ((processedApplications / analytics.total_applications) * 100).toFixed(1) : 0}%`} 
                />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-3xl p-8 shadow-lg border border-purple-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Job Metrics</h3>
              <div className="space-y-4">
                <MetricRow 
                  label="Draft Jobs" 
                  value={`${draftJobs}`} 
                />
                <MetricRow 
                  label="Jobs per Company" 
                  value={analytics.total_companies > 0 ? (analytics.total_jobs / analytics.total_companies).toFixed(1) : '0'} 
                />
                <MetricRow 
                  label="Apps per Active Job" 
                  value={analytics.active_jobs > 0 ? (analytics.total_applications / analytics.active_jobs).toFixed(1) : '0'} 
                />
              </div>
            </div>
          </div>
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