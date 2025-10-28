
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  ChevronRight,
  Users,
  FileText,
  TrendingUp,
  Briefcase,
} from 'lucide-react';
import Sidebar from '@/app/components/sidebar';
import { API_URL } from '@/app/config/constants';


interface DashboardStats {
  total_companies: number;
  total_users: number;
  total_jobs: number;
  total_applications: number;
  active_jobs: number;
  pending_applications: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [userName, setUserName] = useState('Admin');
  const [userEmail, setUserEmail] = useState('admin@example.com');
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
      setUserName(userData.full_name || 'Admin');
      setUserEmail(userData.email || 'admin@example.com');
    }

    loadData();
  }, []);

  const loadData = async () => {
    const token = localStorage.getItem('token');
    try {
      const statsRes = await fetch(`${API_URL}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const statsData = await statsRes.json();
      setStats(statsData);
    } catch (error) {
      console.error('Error loading data:', error);
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

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar */}
      <Sidebar
        activeMenu="dashboard"
        userRole="admin"
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
              You have {stats?.active_jobs || 0} active jobs today.
            </p>
          </div>

          {/* Stats Overview */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <StatCard
                icon={<Building2 className="w-6 h-6" />}
                label="Total Companies"
                value={stats.total_companies}
                color="from-blue-500 to-blue-600"
              />
              <StatCard
                icon={<Users className="w-6 h-6" />}
                label="Total Users"
                value={stats.total_users}
                color="from-green-500 to-green-600"
              />
              <StatCard
                icon={<Briefcase className="w-6 h-6" />}
                label="Total Jobs"
                value={stats.total_jobs}
                color="from-purple-500 to-purple-600"
              />
              <StatCard
                icon={<FileText className="w-6 h-6" />}
                label="Applications"
                value={stats.total_applications}
                color="from-orange-500 to-orange-600"
              />
              <StatCard
                icon={<TrendingUp className="w-6 h-6" />}
                label="Active Jobs"
                value={stats.active_jobs}
                color="from-pink-500 to-pink-600"
              />
              <StatCard
                icon={<FileText className="w-6 h-6" />}
                label="Pending Reviews"
                value={stats.pending_applications}
                color="from-indigo-500 to-indigo-600"
              />
            </div>
          )}

          {/* System Overview */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">System Overview</h2>
            <div className="bg-white/95 rounded-3xl p-8 shadow-xl border border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <JobCard
                  icon="💼"
                  title="Active Companies"
                  type="Organizations"
                  candidates={`${stats?.total_companies || 0} Total`}
                  onClick={() => router.push('/admin/companies')}
                />
                <JobCard
                  icon="👥"
                  title="System Users"
                  type="All Roles"
                  candidates={`${stats?.total_users || 0} Users`}
                  onClick={() => router.push('/admin/users')}
                />
                <JobCard
                  icon="💻"
                  title="Active Jobs"
                  type="Currently Open"
                  candidates={`${stats?.active_jobs || 0} Jobs`}
                  onClick={() => router.push('/admin/jobs')}
                />
                <JobCard
                  icon="📄"
                  title="Applications"
                  type="All Time"
                  candidates={`${stats?.total_applications || 0} Total`}
                  onClick={() => {}}
                />
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <ActionCard
                title="Create Company"
                description="Add a new company to the system"
                icon="🏢"
                onClick={() => router.push('/admin/companies')}
              />
              <ActionCard
                title="Add User"
                description="Create a new user account"
                icon="👤"
                onClick={() => router.push('/admin/users')}
              />
              <ActionCard
                title="View Reports"
                description="Check system analytics"
                icon="📊"
                onClick={() => router.push('/admin/analytics')}
              />
            </div>
          </div>
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
}: {
  icon: string;
  title: string;
  type: string;
  candidates: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center p-6 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all group"
    >
      <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center text-4xl mb-4 shadow-md group-hover:shadow-lg transition-shadow">
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
      className="bg-white/95 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all text-left group"
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