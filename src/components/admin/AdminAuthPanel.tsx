import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Lock, ShieldCheck } from 'lucide-react';

interface AdminAuthPanelProps {
  onAuthenticated: (token: string, email: string) => void;
}

export function AdminAuthPanel({ onAuthenticated }: AdminAuthPanelProps) {
  const [needsSetup, setNeedsSetup] = useState(false);
  const [supabaseConfigured, setSupabaseConfigured] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);

  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/admin/auth/status');
        if (res.ok) {
          const data = await res.json();
          setNeedsSetup(Boolean(data.needsInitialSetup));
          setSupabaseConfigured(Boolean(data.supabaseConfigured));
        }
      } finally {
        setLoadingStatus(false);
      }
    };
    void checkStatus();
  }, []);

  const handleBootstrapOrLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      // If Supabase client env vars are present and not claiming initial local setup, authenticate via Supabase Auth
      const supaUrl = import.meta.env.VITE_SUPABASE_URL;
      const supaAnon = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (supabaseConfigured && supaUrl && supaAnon && !needsSetup) {
        const supabase = createClient(supaUrl, supaAnon);
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error || !data.session?.access_token) {
          setMessage({ type: 'err', text: error?.message || 'Supabase sign-in failed.' });
          return;
        }
        // Verify admin role against server
        const verifyRes = await fetch('/api/admin/me', {
          headers: { Authorization: `Bearer ${data.session.access_token}` },
        });
        if (!verifyRes.ok) {
          setMessage({ type: 'err', text: 'Signed-in user does not have an admin profile in admin_profiles.' });
          return;
        }
        onAuthenticated(data.session.access_token, email);
        return;
      }

      const endpoint = needsSetup ? '/api/admin/auth/bootstrap' : '/api/admin/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'err', text: data.error || 'Authentication failed.' });
      } else {
        onAuthenticated(data.token, data.admin.email);
      }
    } catch {
      setMessage({ type: 'err', text: 'Unable to reach authentication server.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const supaUrl = import.meta.env.VITE_SUPABASE_URL;
      const supaAnon = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (supabaseConfigured && supaUrl && supaAnon) {
        const supabase = createClient(supaUrl, supaAnon);
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) {
          setMessage({ type: 'err', text: error.message });
        } else {
          setMessage({ type: 'ok', text: 'Password reset instructions sent via Supabase Auth.' });
        }
        return;
      }

      const res = await fetch('/api/admin/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setMessage({ type: res.ok ? 'ok' : 'err', text: data.message || data.error });
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingStatus) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center text-sm text-slate-500">
        Checking administrator security configuration...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#10233F]/75 sm:p-8">
        <div className="flex items-center gap-2 text-[#2878FF]">
          {needsSetup ? <ShieldCheck className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
          <span className="text-xs font-semibold uppercase tracking-wider">
            {needsSetup ? 'Initial Admin Claim' : 'INFORVERSE Admin'}
          </span>
        </div>

        <h1 className="mt-2 text-2xl font-bold text-[#071426] dark:text-white">
          {mode === 'forgot'
            ? 'Password Recovery'
            : needsSetup
              ? 'Claim Administrator Account'
              : 'Administrator Sign In'}
        </h1>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          {mode === 'forgot'
            ? 'Enter your administrator email for recovery guidance.'
            : needsSetup
              ? 'No administrator password is configured yet. Create the first administrator account below (hashed with scrypt on the server).'
              : 'Protected editorial & automation console. Sign in with your verified administrator credentials.'}
        </p>

        {mode === 'forgot' ? (
          <form onSubmit={handleForgot} className="mt-6 space-y-4">
            <div>
              <label htmlFor="forgot-email" className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Administrator Email
              </label>
              <input
                id="forgot-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-[#F3F5F8] px-3 text-sm text-[#071426] dark:border-slate-700 dark:bg-[#071426] dark:text-white"
              />
            </div>
            {message && (
              <p className={`text-xs ${message.type === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                {message.text}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="h-10 w-full rounded-lg bg-[#2878FF] text-sm font-semibold text-white hover:bg-[#1f63d6] disabled:opacity-60"
            >
              Send Recovery Info
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setMessage(null);
              }}
              className="w-full text-center text-xs font-medium text-[#2878FF] hover:underline"
            >
              Back to Sign In
            </button>
          </form>
        ) : (
          <form onSubmit={handleBootstrapOrLogin} className="mt-6 space-y-4">
            <div>
              <label htmlFor="admin-email" className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Email
              </label>
              <input
                id="admin-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@inforverse.org"
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-[#F3F5F8] px-3 text-sm text-[#071426] dark:border-slate-700 dark:bg-[#071426] dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="admin-password" className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Password {needsSetup && '(min 8 chars)'}
              </label>
              <input
                id="admin-password"
                type="password"
                required
                minLength={needsSetup ? 8 : 1}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-[#F3F5F8] px-3 text-sm text-[#071426] dark:border-slate-700 dark:bg-[#071426] dark:text-white"
              />
            </div>

            {message && (
              <p className={`text-xs ${message.type === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                {message.text}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="h-10 w-full rounded-lg bg-[#2878FF] text-sm font-semibold text-white transition-colors hover:bg-[#1f63d6] disabled:opacity-60"
            >
              {submitting ? 'Verifying...' : needsSetup ? 'Claim Admin & Enter' : 'Sign In'}
            </button>

            {!needsSetup && (
              <button
                type="button"
                onClick={() => {
                  setMode('forgot');
                  setMessage(null);
                }}
                className="w-full text-center text-xs font-medium text-[#2878FF] hover:underline"
              >
                Forgot Password?
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
