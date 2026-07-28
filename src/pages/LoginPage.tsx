import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { Mail, Lock, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { STORE_CONFIG } from '../config';

export default function LoginPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Detect recent signup attempts for the entered email to prevent triggering Supabase rate limit
  useEffect(() => {
    if (!email.trim() || !isSignUp) return;
    const lastAttempt = localStorage.getItem('last_signup_attempt');
    const storedEmail = localStorage.getItem('signup_email');

    if (lastAttempt && storedEmail === email.trim()) {
      const elapsedMs = Date.now() - parseInt(lastAttempt, 10);
      const oneHourMs = 3600000;
      if (elapsedMs < oneHourMs) {
        const secondsRemaining = Math.floor((oneHourMs - elapsedMs) / 1000);
        setCooldown(secondsRemaining);
      } else {
        setCooldown(0);
      }
    }
  }, [email, isSignUp]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown(prev => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/account', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || (isSignUp && cooldown > 0)) return; // Block multiple clicks or attempts during rate-limit cooldown

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isSignUp) {
        const cleanEmail = email.trim();
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: cleanEmail,
          password: password.trim(),
          options: {
            data: {
              full_name: fullName.trim(),
              phone: phone.trim(),
            },
          },
        });

        if (signUpError) {
          // Handle rate limit gracefully with user-friendly instructions instead of raw error
          if (
            signUpError.message.toLowerCase().includes('rate limit') ||
            (signUpError as any).code === 'over_email_send_rate_limit' ||
            signUpError.message.toLowerCase().includes('security purposes')
          ) {
            setCooldown(3600);
            localStorage.setItem('last_signup_attempt', Date.now().toString());
            localStorage.setItem('signup_email', cleanEmail);
            setEmailSent(true);
          } else {
            setError(signUpError.message);
          }
        } else if (data.user) {
          // Also create profile record if user created
          try {
            await supabase.from('profiles').upsert({
              id: data.user.id,
              full_name: fullName.trim(),
              phone: phone.trim(),
              updated_at: new Date().toISOString(),
            });
          } catch (profileErr) {
            console.warn('Could not sync profile table:', profileErr);
          }
          
          if (data.session) {
            setMessage('Account created successfully!');
            navigate('/account');
          } else {
            // Email verification required - store attempt & display Check Email screen
            localStorage.setItem('last_signup_attempt', Date.now().toString());
            localStorage.setItem('signup_email', cleanEmail);
            setCooldown(3600);
            setEmailSent(true);
          }
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

        if (signInError) {
          setError(signInError.message);
        } else {
          navigate('/account');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f6f8]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-black mb-6 transition-colors min-h-11">
          <ArrowLeft className="w-4 h-4" /> Back to Store
        </Link>
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-black text-white font-black text-2xl flex items-center justify-center mx-auto mb-3">
            S
          </div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">
            {isSignUp ? 'Create your account' : 'Sign in to your account'}
          </h2>
          <p className="mt-1 text-sm text-gray-500 font-medium">
            {isSignUp ? 'Join our marketplace for faster COD checkouts' : 'Manage your orders, coupons and addresses'}
          </p>
        </div>

        <div className="mt-8 bg-white py-8 px-5 shadow-sm rounded-3xl border border-gray-200/80 sm:px-10">
          {emailSent ? (
            <div className="text-center py-2 animate-in fade-in zoom-in-95 duration-300">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5 border border-green-200 shadow-2xs">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-gray-900 mb-2">Check your email!</h3>
              <p className="text-sm font-semibold text-gray-600 mb-4 leading-relaxed">
                We sent a confirmation link to <span className="text-gray-900 font-bold underline decoration-green-500 underline-offset-4">{email}</span>
              </p>
              <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 mb-6 text-left shadow-2xs">
                <p className="text-xs sm:text-sm font-bold text-amber-900 mb-1 flex items-center gap-1.5">
                  <span>Important Note:</span>
                </p>
                <p className="text-xs text-amber-800 font-medium leading-relaxed">
                  Didn't receive it immediately? Please check your <strong>Spam</strong> or <strong>Junk</strong> folder. If you clicked multiple times, your email provider or Supabase may take a short delay to deliver the first link.
                </p>
              </div>
              <button
                type="button"
                onClick={() => window.open('https://gmail.com', '_blank', 'noopener,noreferrer')}
                className="w-full bg-black text-white py-3.5 rounded-xl font-black text-sm hover:bg-gray-800 active:scale-95 transition-all shadow-md min-h-11 flex items-center justify-center gap-2 mb-3"
              >
                Open Gmail
              </button>
              <button
                type="button"
                onClick={() => { setEmailSent(false); setIsSignUp(false); setError(null); setMessage(null); }}
                className="w-full bg-gray-100 text-gray-800 py-3.5 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors min-h-11"
              >
                Return to Sign In
              </button>
              {cooldown > 0 && (
                <p className="text-[11px] font-semibold text-gray-500 mt-6 bg-gray-50 py-2.5 px-3.5 rounded-xl block border border-gray-200/80 leading-relaxed">
                  ⏳ <strong>Resend protection active:</strong> To prevent triggering spam limits, please wait <strong>{Math.floor(cooldown / 60)}m {cooldown % 60}s</strong> before requesting another confirmation email for this address.
                </p>
              )}
            </div>
          ) : (
            <>
              <form className="space-y-4" onSubmit={handleSubmit}>
                {isSignUp && (
                  <>
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">Full Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Rahul Sharma"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-4 py-3.5 min-h-11 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-black outline-none text-sm font-semibold text-gray-900 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">Mobile Number</label>
                      <input
                        type="tel"
                        inputMode="numeric"
                        required
                        placeholder="10-digit mobile number"
                        maxLength={10}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-4 py-3.5 min-h-11 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-black outline-none text-sm font-semibold text-gray-900 transition-all"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 min-h-11 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-black outline-none text-sm font-semibold text-gray-900 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 min-h-11 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-black outline-none text-sm font-semibold text-gray-900 transition-all"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-sm font-medium text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                    {error}
                  </p>
                )}

                {message && (
                  <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-sm font-semibold">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || (isSignUp && cooldown > 0)}
                  className="w-full bg-black text-white py-3.5 rounded-xl font-black text-sm hover:bg-gray-800 active:scale-95 transition-all flex items-center justify-center gap-2 min-h-11 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 shadow-md mt-6"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> {isSignUp ? 'Creating Account...' : 'Signing In...'}</>
                  ) : isSignUp && cooldown > 0 ? (
                    `Please wait ${Math.floor(cooldown / 60)}m ${cooldown % 60}s`
                  ) : (
                    isSignUp ? 'Create Account' : 'Sign In'
                  )}
                </button>
              </form>

              <div className="mt-6 border-t border-gray-100 pt-6 text-center">
                <button
                  type="button"
                  onClick={() => { setIsSignUp(!isSignUp); setError(null); setMessage(null); }}
                  className="text-xs sm:text-sm font-bold text-gray-700 hover:text-black transition-colors min-h-9"
                >
                  {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
