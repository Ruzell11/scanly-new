'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock } from 'lucide-react';
import { API_URL } from '../config/constants';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Login failed');
      }

      localStorage.setItem('token', data.access_token);

      const userResponse = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${data.access_token}`,
        },
      });

      const user = await userResponse.json();
      localStorage.setItem('user', JSON.stringify(user));

      if (user.role === 'admin') {
        router.push('/admin/dashboard');
      } else if (user.role === 'employer') {
        router.push('/employer/dashboard');
      } else {
        router.push('/jobs');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      <div className="flex w-full h-screen">
        
        {/* Left Panel - Full Cover Image */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
          {/* Background Image - Full Cover */}
          <div className="absolute inset-0">
            <img 
              src="../login.png" 
              alt="Login background"
              className="w-full h-full object-left object-cover"
            />
          </div>

          {/* Optional Overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-br from-black/20 to-black/40"></div>

          <div className="relative z-10 flex flex-col items-center justify-center w-full px-12 py-16">
            {/* Title Text */}
            <h2 className="text-4xl font-light text-white drop-shadow-lg italic leading-relaxed text-center">
              Revolutionize how<br />you hire talent.
            </h2>
          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div className="w-full lg:w-1/2 bg-white p-8 md:p-12 lg:p-16 flex flex-col justify-center relative">
          
          {/* Logo Top Right */}
          {/* <div className="absolute top-8 right-8">
            <div className="w-14 h-14 bg-gradient-to-br from-[#4ECDC4] to-[#44A08D] rounded-2xl shadow-lg flex items-center justify-center transform rotate-12">
              <div className="w-10 h-10 bg-white rounded-xl transform -rotate-12"></div>
            </div>
          </div> */}

          {/* Center the form content */}
          <div className="max-w-md w-full mx-auto">
            <div className="mb-12">
              <h1 className="text-4xl font-semibold text-gray-900">
                Log in to your account
              </h1>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Email Input */}
              <div>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="w-full px-5 py-4 pr-12 border-2 border-gray-300 rounded-xl text-gray-900 bg-white focus:outline-none focus:border-gray-400 transition-all placeholder:text-gray-400"
                  />
                  <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full px-5 py-4 pr-12 border-2 border-gray-300 rounded-xl text-gray-900 bg-white focus:outline-none focus:border-gray-400 transition-all placeholder:text-gray-400"
                  />
                  <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
               
                <Link
                  href="/forgot-password"
                  className="text-sm text-gray-600 hover:text-gray-900 italic transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-4 bg-white text-gray-900 border-2 border-gray-900 rounded-xl font-medium text-base hover:bg-gray-900 hover:text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Logging in...
                    </span>
                  ) : (
                    'Submit'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}