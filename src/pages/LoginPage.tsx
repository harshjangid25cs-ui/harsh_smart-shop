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

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/account', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
          options: {
            data: {
              full_name: fullName.trim(),
              phone: phone.trim(),
            },
          },
        });

        if (signUpError) {
          setError(signUpError.message);
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
          setMessage('Account created! If email verification is enabled, please check your email.');
          if (data.session) {
            navigate('/account');
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
              disabled={loading}
              className="w-full bg-black text-white py-3.5 rounded-xl font-black text-sm hover:bg-gray-800 active:scale-95 transition-all flex items-center justify-center gap-2 min-h-11 disabled:opacity-50 shadow-md mt-6"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {isSignUp ? 'Creating Account...' : 'Signing In...'}</>
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
        </div>
      </div>
    </div>
  );
}
