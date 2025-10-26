'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, ArrowLeft } from 'lucide-react';
import { API_URL } from '../config/constants';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to send reset email');
      }

      setSuccess('A temporary password has been sent to your email. Please check your inbox.');
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email. Please try again.');
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
              alt="Forgot Password background"
               className="w-full h-full object-left object-cover"
            />
          </div>

          {/* Overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-br from-black/20 to-black/40"></div>

          <div className="relative z-10 flex flex-col items-center justify-center w-full px-12 py-16">
            {/* Title Text */}
            <h2 className="text-4xl font-light text-white drop-shadow-lg italic leading-relaxed text-center">
              Reset your password<br />and get back to work.
            </h2>
          </div>
        </div>

        {/* Right Panel - Forgot Password Form */}
        <div className="w-full lg:w-1/2 bg-white p-8 md:p-12 lg:p-16 flex flex-col justify-center relative">
          
          {/* Logo Top Right */}
          {/* <div className="absolute top-8 right-8">
            <div className="w-14 h-14 bg-gradient-to-br from-[#4ECDC4] to-[#44A08D] rounded-2xl shadow-lg flex items-center justify-center transform rotate-12">
              <div className="w-10 h-10 bg-white rounded-xl transform -rotate-12"></div>
            </div>
          </div> */}

          {/* Back to Login Button */}
          <button
            onClick={() => router.push('/login')}
            className="absolute top-8 left-8 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back to Login</span>
          </button>

          {/* Center the form content */}
          <div className="max-w-md w-full mx-auto">
            <div className="mb-8">
              <h1 className="text-4xl font-semibold text-gray-900 mb-3">
                Forgot Password?
              </h1>
              <p className="text-gray-600">
                Enter your email address and we'll send you a temporary password to reset your account.
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Email Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
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
                      Sending...
                    </span>
                  ) : (
                    'Send Reset Email'
                  )}
                </button>
              </div>
            </form>

            {/* Additional Help */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                Remember your password?{' '}
                <button
                  onClick={() => router.push('/login')}
                  className="text-gray-900 font-medium hover:underline"
                >
                  Sign in here
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}