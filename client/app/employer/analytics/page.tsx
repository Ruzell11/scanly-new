'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import Sidebar from '@/app/components/sidebar';
import { API_URL } from '@/app/config/constants';
import { Users, FileText, TrendingUp, Briefcase } from 'lucide-react';

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

  // Aggregates
  const hiredCount = applications.filter(a => a.status === 'hired').length;
  const shortlistedCount = applications.filter(a => a.status === 'shortlisted').length;
  const pendingCount = applications.filter(a => a.status === 'pending').length;
  const totalJobs = jobs.length;
  const totalApplications = applications.length;

  // Chart Data
  const pieData = [
    { name: 'Hired', value: hiredCount },
    { name: 'Shortlisted', value: shortlistedCount },
    { name: 'Pending', value: pendingCount },
  ];

  const COLORS = ['#22c55e', '#a855f7', '#f59e0b'];

  const barData = jobs.reduce((acc: Record<string, number>, job) => {
    const month = new Date(job.created_at).toLocaleString('default', { month: 'short' });
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {});
  const barChartData = Object.entries(barData).map(([month, count]) => ({ month, count }));

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3F5357]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex">
      <Sidebar
        activeMenu="analytics"
        userRole="employer"
        userName={userName}
        userEmail={userEmail}
      />

      <main className="flex-1 overflow-auto bg-white">
        <div className="max-w-7xl mx-auto p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">📊 Employer Analytics</h1>
          <p className="text-gray-600 mb-10">
            Analyze your hiring performance and application trends.
          </p>

          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            <StatCard icon={<Briefcase className="w-6 h-6" />} label="Total Jobs" value={totalJobs} color="from-blue-500 to-blue-600" />
            <StatCard icon={<FileText className="w-6 h-6" />} label="Total Applications" value={totalApplications} color="from-green-500 to-green-600" />
            <StatCard icon={<Users className="w-6 h-6" />} label="Shortlisted" value={shortlistedCount} color="from-purple-500 to-purple-600" />
            <StatCard icon={<TrendingUp className="w-6 h-6" />} label="Hired" value={hiredCount} color="from-orange-500 to-orange-600" />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Application Status Pie Chart */}
            <div className="bg-white/95 rounded-3xl p-8 shadow-lg border border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Application Status Distribution</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} label>
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Job Posting Trends */}
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
