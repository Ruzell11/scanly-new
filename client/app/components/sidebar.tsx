
// ============================================
// FILE: components/Sidebar.tsx
// ============================================
'use client';

import { useRouter } from 'next/navigation';
import {
  LayoutGrid,
  Briefcase,
  Building2,
  Shield,
  Settings,
  LogOut,
  Users,
} from 'lucide-react';

interface SidebarProps {
  activeMenu?: string;
  userRole?: 'admin' | 'employer' | 'applicant';
  userName?: string;
  userEmail?: string;
}

export default function Sidebar({
  activeMenu = 'overview',
  userRole = 'admin',
  userName = 'User',
  userEmail = 'user@example.com',
}: SidebarProps) {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  // Navigation items based on role
  const getNavigationItems = () => {
    if (userRole === 'admin') {
      return [
        {
          icon: <LayoutGrid className="w-5 h-5" />,
          label: 'Dashboard',
          path: '/admin/dashboard',
          active: activeMenu === 'overview' || activeMenu === 'dashboard',
        },
           {
          icon: <Briefcase className="w-5 h-5" />,
          label: 'Job Lists',
          path: '/admin/jobs',
          active: activeMenu === 'jobs',
        },
        {
          icon: <Building2 className="w-5 h-5" />,
          label: 'Organization',
          path: '/admin/companies',
          active: activeMenu === 'companies' || activeMenu === 'organization',
        },
        {
          icon: <Users className="w-5 h-5" />,
          label: 'Users',
          path: '/admin/users',
          active: activeMenu === 'users',
        },

        {
          icon: <Settings className="w-5 h-5" />,
          label: 'Settings',
          path: '/admin/settings',
          active: activeMenu === 'settings',
        },
      ];
    } else if (userRole === 'employer') {
      return [
        {
          icon: <LayoutGrid className="w-5 h-5" />,
          label: 'Job Overview',
          path: '/employer/dashboard',
          active: activeMenu === 'overview',
        },
        {
          icon: <Briefcase className="w-5 h-5" />,
          label: 'Job Lists',
          path: '/employer/jobs',
          active: activeMenu === 'jobs',
        },
        {
          icon: <Users className="w-5 h-5" />,
          label: 'Candidates',
          path: '/employer/candidates',
          active: activeMenu === 'candidates',
        },
        {
          icon: <Settings className="w-5 h-5" />,
          label: 'Settings',
          path: '/employer/settings',
          active: activeMenu === 'settings',
        },
      ];
    }

    return [];
  };

  const navigationItems = getNavigationItems();

  return (
    <aside className="w-72 bg-gradient-to-b from-[#2d4a52] to-[#1e3339] p-6 flex flex-col border-r border-[#3F5357]">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-12">
        <div className="w-10 h-10 bg-gradient-to-br from-[#4a9eff] to-[#7b5bff] rounded-xl flex items-center justify-center shadow-lg">
          <span className="text-white font-bold text-xl">S</span>
        </div>
        <span className="text-white text-xl font-semibold">Scanly</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2">
        {navigationItems.map((item, index) => (
          <NavItem
            key={index}
            icon={item.icon}
            label={item.label}
            active={item.active}
            onClick={() => router.push(item.path)}
          />
        ))}
      </nav>

      {/* User Profile */}
      <div className="mt-auto pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {userName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{userName}</p>
            <p className="text-white/60 text-xs truncate">{userEmail}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
            title="Logout"
          >
            <LogOut className="w-4 h-4 text-white/60" />
          </button>
        </div>
      </div>
    </aside>
  );
}

// Navigation Item Component
function NavItem({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        active
          ? 'bg-white/10 text-white shadow-lg'
          : 'text-white/70 hover:bg-white/5 hover:text-white'
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );
}
