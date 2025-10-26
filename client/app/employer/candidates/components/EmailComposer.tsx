'use client';

import { useState } from 'react';
import { X, Mail, Send, AlertCircle } from 'lucide-react';
import { API_URL } from '@/app/config/constants';

interface EmailComposerProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: {
    id: number;
    full_name: string;
    email: string;
    job_title: string;
  };
  onEmailSent?: () => void;
}

export default function EmailComposer({ isOpen, onClose, candidate, onEmailSent }: EmailComposerProps) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Email templates
  const templates = [
    {
      name: 'Interview Invitation',
      subject: `Interview Invitation - ${candidate.job_title}`,
      body: `Dear ${candidate.full_name},

We are pleased to inform you that your application for the ${candidate.job_title} position has been reviewed, and we would like to invite you for an interview.

Interview Details:
• Date: [Please specify date]
• Time: [Please specify time]
• Location/Platform: [Please specify]
• Duration: Approximately 30-45 minutes

Please confirm your availability by replying to this email. If the proposed time doesn't work for you, please suggest alternative times.

We look forward to meeting you!

Best regards,
[Your Name]
[Company Name]`
    },
    {
      name: 'Application Received',
      subject: `Application Received - ${candidate.job_title}`,
      body: `Dear ${candidate.full_name},

Thank you for your interest in the ${candidate.job_title} position at our company.

We have received your application and our team is currently reviewing all submissions. We will contact you within the next few days regarding the next steps in the hiring process.

If you have any questions in the meantime, please don't hesitate to reach out.

Best regards,
[Your Name]
[Company Name]`
    },
    {
      name: 'Request Additional Information',
      subject: `Additional Information Needed - ${candidate.job_title}`,
      body: `Dear ${candidate.full_name},

Thank you for your application for the ${candidate.job_title} position.

We would like to learn more about your qualifications. Could you please provide the following:

• [Specify what information you need]

Please send the requested information by replying to this email at your earliest convenience.

Thank you for your cooperation.

Best regards,
[Your Name]
[Company Name]`
    },
    {
      name: 'Rejection (Polite)',
      subject: `Update on Your Application - ${candidate.job_title}`,
      body: `Dear ${candidate.full_name},

Thank you for taking the time to apply for the ${candidate.job_title} position and for your interest in our company.

After careful consideration, we have decided to move forward with other candidates whose qualifications more closely match our current needs.

We were impressed with your background and encourage you to apply for future positions that match your skills and experience. We will keep your resume on file for consideration.

We wish you the best in your job search and future endeavors.

Best regards,
[Your Name]
[Company Name]`
    },
    {
      name: 'Job Offer',
      subject: `Job Offer - ${candidate.job_title}`,
      body: `Dear ${candidate.full_name},

Congratulations! We are delighted to offer you the position of ${candidate.job_title} at our company.

Offer Details:
• Position: ${candidate.job_title}
• Start Date: [Please specify]
• Salary: [Please specify]
• Benefits: [Please specify]

Please review the attached formal offer letter and employment agreement. If you accept this offer, please sign and return the documents by [date].

We are excited about the possibility of you joining our team!

If you have any questions, please don't hesitate to contact us.

Best regards,
[Your Name]
[Company Name]`
    },
  ];

  const handleTemplateSelect = (template: typeof templates[0]) => {
    setSubject(template.subject);
    setMessage(template.body);
  };

  const handleSendEmail = async () => {
    if (!subject.trim() || !message.trim()) {
      setError('Please fill in both subject and message');
      return;
    }

    setSending(true);
    setError('');
    setSuccess(false);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/employer/candidates/${candidate.id}/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject,
          message,
          recipient_email: candidate.email,
          recipient_name: candidate.full_name,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to send email');
      }

      setSuccess(true);
      setTimeout(() => {
        onEmailSent?.();
        onClose();
        // Reset form
        setSubject('');
        setMessage('');
        setSuccess(false);
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col text-black">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#3F5357] to-[#2C2C2C] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white bg-opacity-20 p-2 rounded-lg">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Compose Email</h2>
              <p className="text-sm text-white text-opacity-80">
                Send to: {candidate.full_name} ({candidate.email})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Email Templates */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Quick Templates (Optional)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
              {templates.map((template, index) => (
                <button
                  key={index}
                  onClick={() => handleTemplateSelect(template)}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors border border-gray-300"
                >
                  {template.name}
                </button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject *
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#3F5357] transition-colors"
            />
          </div>

          {/* Message */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message *
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              rows={15}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#3F5357] transition-colors resize-none font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-2">
              {message.length} characters
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-green-700 font-medium">
                Email sent successfully! ✓
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
          <div className="text-sm text-gray-600">
            <span className="font-medium">To:</span> {candidate.email}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={sending}
              className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSendEmail}
              disabled={sending || !subject.trim() || !message.trim()}
              className="px-6 py-2.5 bg-gradient-to-r from-[#3F5357] to-[#2C2C2C] hover:from-[#344447] hover:to-[#1a1a1a] text-white rounded-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {sending ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Email
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}