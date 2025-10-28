// ============================================
// FILE: app/admin/users/page.tsx
// ============================================
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  Trash2,
  Search,
  Edit,
} from 'lucide-react';
import Sidebar from '@/app/components/sidebar';
import { API_URL } from '@/app/config/constants';

interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  company_id?: number;
  created_at: string;
}

interface Company {
  id: number;
  name: string;
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [userName, setUserName] = useState('Admin');
  const [userEmail, setUserEmail] = useState('admin@example.com');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: '',
    company_id: '',
  });
  const [formError, setFormError] = useState('');

  const itemsPerPage = 10;

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
      // Load users
      const usersResponse = await fetch(`${API_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const usersData = await usersResponse.json();
      setUsers(usersData);

      // Load companies for dropdown
      const companiesResponse = await fetch(`${API_URL}/admin/companies`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const companiesData = await companiesResponse.json();
      setCompanies(companiesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const token = localStorage.getItem('token');
    
    try {
      const payload = {
        email: formData.email,
        full_name: formData.full_name,
        role: formData.role,
        company_id: formData.company_id ? parseInt(formData.company_id) : null,
        ...((!isEditing || formData.password) && { password: formData.password }),
      };

      const url = isEditing && selectedUser
        ? `${API_URL}/admin/users/${selectedUser.id}`
        : `${API_URL}/admin/users`;
      
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to ${isEditing ? 'update' : 'create'} user`);
      }

      setShowModal(false);
      setIsEditing(false);
      loadData();
      setFormData({
        email: '',
        password: '',
        full_name: '',
        role: '',
        company_id: '',
      });
    } catch (error: any) {
      setFormError(error.message);
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    const token = localStorage.getItem('token');
    try {
      await fetch(`${API_URL}/admin/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setShowViewModal(false);
      loadData();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setShowViewModal(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      password: '', // Don't pre-fill password
      full_name: user.full_name,
      role: user.role,
      company_id: user.company_id ? user.company_id.toString() : '',
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'employer':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCompanyName = (companyId?: number) => {
    if (!companyId) return 'N/A';
    const company = companies.find(c => c.id === companyId);
    return company ? company.name : 'Unknown';
  };

  const totalPages = Math.ceil(users.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  
  // Filter users based on search query
  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.full_name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query) ||
      getCompanyName(user.company_id).toLowerCase().includes(query)
    );
  });
  
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

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
        activeMenu="users"
        userRole="admin"
        userName={userName}
        userEmail={userEmail}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-white">
        <div className="p-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
            <span>Admin</span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900 font-medium">Users</span>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">System Users</h1>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#3F5357] hover:bg-[#344447] text-white rounded-lg transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add New User
            </button>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, role, or company..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1); // Reset to first page on search
                }}
                className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3F5357] focus:border-transparent text-sm bg-white text-gray-900 placeholder:text-gray-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#d4dfe3]">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Full Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      No users found. Add your first user to get started.
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-gray-300"
                          />
                          <span className="text-sm font-medium text-gray-900">
                            {user.full_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {user.email}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {getCompanyName(user.company_id)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleViewUser(user)}
                            className="text-sm text-[#3F5357] hover:text-[#2C2C2C] font-medium"
                          >
                            Quick view
                          </button>
                          <button
                            onClick={() => handleEditUser(user)}
                            className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-1 text-red-600 hover:text-red-800 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === i + 1
                      ? 'bg-gray-800 text-white'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  {i + 1}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Create User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#2d4a52] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">
                  {isEditing ? 'Edit User' : 'Create a New User'}
                </h2>
                <p className="text-white/60 text-sm">
                  {isEditing ? 'Update user information' : 'Add a new user to the system'}
                </p>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-6">
                {formError && (
                  <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                    {formError}
                  </div>
                )}

                {/* Full Name */}
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-4 py-3 bg-[#3d5a62] border border-[#4a6872] rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-[#5a7882]"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="user@example.com"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-[#3d5a62] border border-[#4a6872] rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-[#5a7882]"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Password {!isEditing && <span className="text-red-300">*</span>}
                  </label>
                  <input
                    type="password"
                    placeholder={isEditing ? "Leave blank to keep current password" : "••••••••"}
                    required={!isEditing}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-3 bg-[#3d5a62] border border-[#4a6872] rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-[#5a7882]"
                  />
                  {isEditing && (
                    <p className="text-white/60 text-xs mt-1">
                      Leave blank to keep current password
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Role */}
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">
                      Role
                    </label>
                    <select
                      required
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full px-4 py-3 bg-[#3d5a62] border border-[#4a6872] rounded-lg text-white focus:outline-none focus:border-[#5a7882]"
                    >
                      <option value="">Select Role</option>
                      <option value="admin">Admin</option>
                      <option value="employer">Employer</option>
                    </select>
                  </div>

                  {/* Company */}
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">
                      Company {formData.role === 'employer' && <span className="text-red-300">*</span>}
                    </label>
                    <select
                      required={formData.role === 'employer'}
                      value={formData.company_id}
                      onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                      className="w-full px-4 py-3 bg-[#3d5a62] border border-[#4a6872] rounded-lg text-white focus:outline-none focus:border-[#5a7882]"
                    >
                      <option value="">Select Company</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                    {formData.role === 'employer' && (
                      <p className="text-white/60 text-xs mt-1">
                        Employer must be assigned to a company
                      </p>
                    )}
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setFormError('');
                      setIsEditing(false);
                      setFormData({
                        email: '',
                        password: '',
                        full_name: '',
                        role: '',
                        company_id: '',
                      });
                    }}
                    className="flex-1 px-6 py-3 bg-transparent border border-white/20 text-white rounded-lg hover:bg-white/10 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-[#4a9eff] hover:bg-[#3d8ae6] text-white rounded-lg transition-colors font-medium"
                  >
                    {isEditing ? 'Update' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Quick View Modal */}
      {showViewModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">
                    User Details
                  </h2>
                  <p className="text-gray-500 text-sm">
                    View user information
                  </p>
                </div>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* User Info */}
              <div className="space-y-6">
                {/* Full Name */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <label className="block text-sm font-medium text-gray-500 mb-2">
                    Full Name
                  </label>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedUser.full_name}
                  </p>
                </div>

                {/* Email */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <label className="block text-sm font-medium text-gray-500 mb-2">
                    Email Address
                  </label>
                  <p className="text-lg font-medium text-gray-900">
                    {selectedUser.email}
                  </p>
                </div>

                {/* Role */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <label className="block text-sm font-medium text-gray-500 mb-2">
                    Role
                  </label>
                  <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getRoleBadgeColor(selectedUser.role)}`}>
                    {selectedUser.role}
                  </span>
                </div>

                {/* Company */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <label className="block text-sm font-medium text-gray-500 mb-2">
                    Company
                  </label>
                  <p className="text-lg font-medium text-gray-900">
                    {getCompanyName(selectedUser.company_id)}
                  </p>
                </div>

                {/* Created Date */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <label className="block text-sm font-medium text-gray-500 mb-2">
                    Created Date
                  </label>
                  <p className="text-base text-gray-900">
                    {new Date(selectedUser.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-colors font-medium"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    handleEditUser(selectedUser);
                  }}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit User
                </button>
                <button
                  onClick={() => handleDeleteUser(selectedUser.id)}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}