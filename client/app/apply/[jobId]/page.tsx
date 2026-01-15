// ============================================
// FILE: app/apply/[jobId]/page.tsx (WITH OPTIONAL DOCUMENTS)
// ============================================
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Briefcase,
  MapPin,
  DollarSign,
  Upload,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Loader2,
  Building,
  FileText,
  Award,
} from 'lucide-react';
import { API_URL } from '@/app/config/constants';

interface Job {
  id: number;
  title: string;
  description: string;
  requirements: string;
  location: string;
  salary_range?: string;
  employment_type: string;
  company_name: string;
  company_industry?: string;
  created_at: string;
}

export default function JobApplicationPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    applicant_name: '',
    applicant_email: '',
  });

  // File uploads - all optional
  const [resume, setResume] = useState<File | null>(null);
  const [coe, setCoe] = useState<File | null>(null);
  const [diploma, setDiploma] = useState<File | null>(null);
  const [certifications, setCertifications] = useState<File[]>([]);

  const [resumeError, setResumeError] = useState<string | null>(null);
  const [coeError, setCoeError] = useState<string | null>(null);
  const [diplomaError, setDiplomaError] = useState<string | null>(null);
  const [certsError, setCertsError] = useState<string | null>(null);

  useEffect(() => {
    loadJobDetails();
  }, [jobId]);

  const loadJobDetails = async () => {
    try {
      const response = await fetch(`${API_URL}/jobs/${jobId}/public`);
      
      if (!response.ok) {
        throw new Error('Job not found or no longer available');
      }

      const data = await response.json();
      setJob(data);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const validateFile = (file: File, setError: (msg: string | null) => void) => {
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    if (!validTypes.includes(file.type)) {
      setError('Please upload a PDF, DOC, or DOCX file');
      return false;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return false;
    }

    setError(null);
    return true;
  };

  const handleResumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setResumeError(null);

    if (!file) {
      setResume(null);
      return;
    }

    if (validateFile(file, setResumeError)) {
      setResume(file);
    }
  };

  const handleCoeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setCoeError(null);

    if (!file) {
      setCoe(null);
      return;
    }

    if (validateFile(file, setCoeError)) {
      setCoe(file);
    }
  };

  const handleDiplomaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setDiplomaError(null);

    if (!file) {
      setDiploma(null);
      return;
    }

    if (validateFile(file, setDiplomaError)) {
      setDiploma(file);
    }
  };

const handleCertificationsChange = (
  e: React.ChangeEvent<HTMLInputElement>
) => {
  setCertsError(null);

  const fileList = e.target.files;
  if (!fileList) {
    setCertifications([]);
    return;
  }

  // Always convert to array (even if only one file)
  const files: File[] = Array.from(fileList);

  // Validate all files
  const validFiles: File[] = [];
  for (const file of files) {
    if (!validateFile(file, setCertsError)) {
      return; // stop if any file is invalid
    }
    validFiles.push(file);
  }

  // ALWAYS an array
  setCertifications(validFiles);
};


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (!resume) {
      setError('Please upload your resume (required)');
      setSubmitting(false);
      return;
    }

    try {
      // Create FormData
      const submitData = new FormData();
      submitData.append('applicant_name', formData.applicant_name);
      submitData.append('applicant_email', formData.applicant_email);
      submitData.append('resume', resume);

      // Add optional documents
      if (coe) {
        submitData.append('coe', coe);
      }
      if (diploma) {
        submitData.append('diploma', diploma);
      }
      if (certifications) {
         submitData.append('certifications', certifications[0]);
      
      }

      console.log('Submitting application to:', `${API_URL}/apply/${jobId}`);

      const response = await fetch(`${API_URL}/apply/${jobId}`, {
        method: 'POST',
        body: submitData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to submit application');
      }

      const result = await response.json();
      console.log('Application submitted successfully:', result);
      setSuccess(true);

      // Scroll to top to show success message
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      console.error('Submission error:', error);
      setError(error.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#3F5357] animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (error && !job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Job Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-[#3F5357] text-white rounded-lg hover:bg-[#344447] transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Application Submitted!</h1>
          <p className="text-lg text-gray-600 mb-2">
            Thank you for applying to <strong>{job?.title}</strong> at <strong>{job?.company_name}</strong>
          </p>
          <p className="text-gray-500 mb-8">
            We've received your application and our team will review it shortly. 
            You'll receive an email confirmation at <strong>{formData.applicant_email}</strong>
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h3 className="font-semibold text-blue-900 mb-2">What's Next?</h3>
            <ul className="text-sm text-blue-800 text-left space-y-2">
              <li>✓ Your application has been submitted</li>
              <li>✓ AI analysis of your resume is in progress</li>
              <li>✓ Our hiring team will review your profile</li>
              <li>✓ We'll contact you if you're selected for an interview</li>
            </ul>
          </div>

          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-[#3F5357] text-white rounded-lg hover:bg-[#344447] transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-black">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Apply for Position</h1>
          <p className="text-gray-600 mt-2">Fill out the form below to submit your application</p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Job Details Card */}
        {job && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{job.title}</h2>
                <div className="flex items-center gap-2 mt-2 text-gray-600">
                  <Building className="w-4 h-4" />
                  <span className="font-medium">{job.company_name}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>{job.location}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Briefcase className="w-4 h-4" />
                <span className="capitalize">{job.employment_type}</span>
              </div>
              {job.salary_range && (
                <div className="flex items-center gap-2 text-gray-600">
                  <DollarSign className="w-4 h-4" />
                  <span>{job.salary_range}</span>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h3 className="font-semibold text-gray-900 mb-2">Job Description</h3>
              <p className="text-gray-700 whitespace-pre-line">{job.description}</p>
            </div>

            <div className="border-t border-gray-200 pt-4 mt-4">
              <h3 className="font-semibold text-gray-900 mb-2">Requirements</h3>
              <p className="text-gray-700 whitespace-pre-line">{job.requirements}</p>
            </div>
          </div>
        )}

        {/* Application Form */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Application</h2>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-900">Application Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                Your Information
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.applicant_name}
                  onChange={(e) => setFormData({ ...formData, applicant_name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3F5357] focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.applicant_email}
                  onChange={(e) => setFormData({ ...formData, applicant_email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3F5357] focus:border-transparent"
                  placeholder="john@example.com"
                />
              </div>
            </div>

            {/* Documents Upload Section */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                Documents
              </h3>

              {/* Resume Upload (Required) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resume/CV <span className="text-red-500">*</span>
                </label>
                <div className="mt-2">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#3F5357] transition-colors bg-gray-50 hover:bg-gray-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-10 h-10 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600 mb-1">
                        {resume ? (
                          <span className="font-medium text-[#3F5357]">✓ {resume.name}</span>
                        ) : (
                          <>
                            <span className="font-semibold">Click to upload</span> or drag and drop
                          </>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">PDF, DOC, or DOCX (MAX. 5MB)</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx"
                      onChange={handleResumeChange}
                      required
                    />
                  </label>
                </div>
                {resumeError && (
                  <p className="text-sm text-red-600 mt-2">{resumeError}</p>
                )}
              </div>

              {/* Optional Documents Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">Optional Documents</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      The following documents are optional but may strengthen your application and improve your AI score.
                    </p>
                  </div>
                </div>
              </div>

              {/* COE Upload (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FileText className="inline w-4 h-4 mr-1" />
                  Certificate of Employment (COE) 
                  <span className="text-green-600 text-xs ml-2 font-normal">Optional - Bonus points</span>
                </label>
                <div className="mt-2">
                  <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-400 transition-colors bg-gray-50 hover:bg-green-50">
                    <div className="flex flex-col items-center justify-center pt-4 pb-5">
                      <FileText className="w-8 h-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">
                        {coe ? (
                          <span className="font-medium text-green-600">✓ {coe.name}</span>
                        ) : (
                          <span>Click to upload COE</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">PDF, DOC, or DOCX (MAX. 5MB)</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx"
                      onChange={handleCoeChange}
                    />
                  </label>
                </div>
                {coeError && (
                  <p className="text-sm text-red-600 mt-2">{coeError}</p>
                )}
              </div>

              {/* Diploma Upload (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Award className="inline w-4 h-4 mr-1" />
                  Diploma / Educational Certificate
                  <span className="text-green-600 text-xs ml-2 font-normal">Optional - Bonus points</span>
                </label>
                <div className="mt-2">
                  <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-400 transition-colors bg-gray-50 hover:bg-green-50">
                    <div className="flex flex-col items-center justify-center pt-4 pb-5">
                      <Award className="w-8 h-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">
                        {diploma ? (
                          <span className="font-medium text-green-600">✓ {diploma.name}</span>
                        ) : (
                          <span>Click to upload diploma</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">PDF, DOC, or DOCX (MAX. 5MB)</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx"
                      onChange={handleDiplomaChange}
                    />
                  </label>
                </div>
                {diplomaError && (
                  <p className="text-sm text-red-600 mt-2">{diplomaError}</p>
                )}
              </div>

              {/* Certifications Upload (Optional, Multiple) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Award className="inline w-4 h-4 mr-1" />
                  Professional Certifications
                  <span className="text-green-600 text-xs ml-2 font-normal">Optional - Bonus points</span>
                </label>
                <div className="mt-2">
                  <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-400 transition-colors bg-gray-50 hover:bg-green-50">
                    <div className="flex flex-col items-center justify-center pt-4 pb-5">
                      <Award className="w-8 h-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">
                        {certifications.length > 0 ? (
                          <span className="font-medium text-green-600">
                            ✓ {certifications.length} file{certifications.length > 1 ? 's' : ''} selected
                          </span>
                        ) : (
                          <span>Click to upload certifications (multiple files allowed)</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">PDF, DOC, or DOCX (MAX. 5MB each)</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx"
                      onChange={handleCertificationsChange}
                      multiple
                    />
                  </label>
                </div>
                {certifications.length > 0 && (
                  <div className="mt-2 text-xs text-gray-600">
                    <p className="font-medium mb-1">Selected files:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {certifications.map((cert, idx) => (
                        <li key={idx}>{cert.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {certsError && (
                  <p className="text-sm text-red-600 mt-2">{certsError}</p>
                )}
              </div>
            </div>

            {/* AI Notice */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-5">
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 rounded-full p-2">
                  <AlertCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-blue-900 mb-1">AI-Powered Review</h4>
                  <p className="text-sm text-blue-700">
                    Your resume will be automatically analyzed by our AI system to match your 
                    qualifications with the job requirements. Optional documents (COE, diploma, certifications) can boost your score by demonstrating additional qualifications 
                    and credibility.
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !resume}
                className="flex-1 px-6 py-3 bg-[#3F5357] text-white rounded-lg hover:bg-[#344447] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting Application...
                  </>
                ) : (
                  'Submit Application'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Privacy Notice */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>
            By submitting this application, you agree to our privacy policy and 
            consent to the processing of your personal data.
          </p>
        </div>
      </div>
    </div>
  );
}