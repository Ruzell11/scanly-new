'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutGrid,
  Briefcase,
  Building2,
  Settings,
  LogOut,
  Users,
  Menu,
  X,
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
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

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
        // {
        //   icon: <Building2 className="w-5 h-5" />,
        //   label: 'Organization',
        //   path: '/admin/companies',
        //   active: activeMenu === 'companies',
        // },
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
    }

    if (userRole === 'employer') {
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
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-[#1e3339] flex items-center px-4 z-50">
        <button
          onClick={() => setOpen(true)}
          className="p-2 rounded-lg hover:bg-white/10"
        >
          <Menu className="w-6 h-6 text-white" />
        </button>
        <span className="ml-3 text-white font-semibold">Scanly</span>
      </div>

      {/* Overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:fixed top-0 inset-y-0 left-0 h-screen lg:h-screen left-0 z-50 h-full w-72 bg-gradient-to-b from-[#2d4a52] to-[#1e3339] p-6 flex flex-col border-r border-[#3F5357] transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#4a9eff] to-[#7b5bff] rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">S</span>
            </div>
            <span className="text-white text-xl font-semibold">Scanly</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="lg:hidden p-2 hover:bg-white/10 rounded-lg"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2">
          {navigationItems.map((item, index) => (
            <NavItem
              key={index}
              icon={item.icon}
              label={item.label}
              active={item.active}
              onClick={() => {
                router.push(item.path);
                setOpen(false);
              }}
            />
          ))}
        </nav>

        {/* User */}
        <div className="pt-6 border-t border-white/10">
          <div className="flex items-center gap-3">
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
              className="p-2 hover:bg-white/10 rounded-lg"
            >
              <LogOut className="w-4 h-4 text-white/60" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

function NavItem({
  icon,
  label,
  active,
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
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all
        ${active ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );
}
