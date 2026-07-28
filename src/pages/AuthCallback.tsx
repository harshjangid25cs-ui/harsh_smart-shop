import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

type AuthStatus = 'processing' | 'success' | 'error';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<AuthStatus>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const processedRef = useRef(false);

  useEffect(() => {
    // Prevent double processing (React StrictMode)
    if (processedRef.current) return;
    processedRef.current = true;

    const handleAuthCallback = async () => {
      try {
        // SECURITY: Verify we're on HTTPS in production
        if (
          window.location.protocol !== 'https:' &&
          !window.location.hostname.includes('localhost') &&
          !window.location.hostname.includes('127.0.0.1')
        ) {
          // Force HTTPS redirect
          window.location.href = window.location.href.replace('http:', 'https:');
          return;
        }

        // Check for error parameters first
        const errorDescription = searchParams.get('error_description');
        if (errorDescription) {
          throw new Error(decodeURIComponent(errorDescription));
        }

        // Extract tokens from URL (Supabase sends them in hash or query)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const access_token = hashParams.get('access_token') || searchParams.get('access_token');
        const refresh_token = hashParams.get('refresh_token') || searchParams.get('refresh_token');
        const type = searchParams.get('type');

        // Handle password recovery flow
        if (type === 'recovery' && access_token) {
          // Store tokens temporarily for password reset page
          sessionStorage.setItem('recovery_token', access_token);
          navigate('/reset-password', { replace: true });
          return;
        }

        // Validate tokens exist
        if (!access_token || !refresh_token) {
          throw new Error('Invalid verification link. Please request a new one.');
        }

        // SECURITY: Set session with tokens
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        if (sessionError || !sessionData.session) {
          throw new Error(sessionError?.message || 'Failed to establish session');
        }

        // SECURITY: Verify session is actually valid by fetching user
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
          throw new Error('Session verification failed. Please log in manually.');
        }

        // Check if email is confirmed
        if (!user.email_confirmed_at && type !== 'signup') {
          throw new Error('Email not verified. Please check your inbox.');
        }

        // SUCCESS: Clear hash from URL (security) and redirect
        window.history.replaceState({}, document.title, window.location.pathname);
        
        setStatus('success');
        
        // Redirect after showing success briefly
        setTimeout(() => {
          navigate('/account', { replace: true });
        }, 1500);

      } catch (err: any) {
        console.error('Auth callback error:', err);
        setStatus('error');
        setErrorMessage(err?.message || 'Verification failed. Please try again.');
      }
    };

    handleAuthCallback();
  }, [navigate, searchParams]);

  // XSS Protection: Sanitize error messages
  const sanitizeMessage = (msg: string) => {
    return msg.replace(/[<>]/g, '');
  };

  if (status === 'processing') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200/80 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Verifying your email...</h2>
          <p className="text-gray-500 text-sm font-medium">Please wait while we confirm your account.</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200/80 p-8 max-w-md w-full text-center animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-100">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Email verified!</h2>
          <p className="text-gray-500 text-sm mb-6 font-medium">Redirecting to your account dashboard...</p>
          <button
            onClick={() => navigate('/account')}
            className="w-full bg-black text-white py-3.5 rounded-xl font-black text-sm hover:bg-gray-800 active:scale-95 transition-all shadow-md min-h-11"
          >
            Go to Account Now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-200/80 p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-xl font-black text-gray-900 mb-2">Verification Failed</h2>
        <p className="text-gray-600 mb-6 text-sm font-semibold leading-relaxed">
          {sanitizeMessage(errorMessage)}
        </p>
        <div className="space-y-3">
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-black text-white py-3.5 rounded-xl font-black text-sm hover:bg-gray-800 active:scale-95 transition-all shadow-md min-h-11"
          >
            Back to Login
          </button>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-gray-100 text-gray-700 py-3.5 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors min-h-11"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}
