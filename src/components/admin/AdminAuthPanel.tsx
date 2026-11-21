import React, { useState } from 'react';
import {
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { KeyRound, Lock, ShieldAlert } from 'lucide-react';
import { auth } from '../../lib/firebase';
import { useApp } from '../../context/AppContext';
import { DEFAULT_LOGO_URL } from '../../data/baselineCatalog';

export function AdminAuthPanel() {
  const { firebaseUser, adminProfile, authLoading, refreshAdminAuth, websiteSettings } = useApp();
  const logoSrc = websiteSettings?.logo_url?.trim() || DEFAULT_LOGO_URL;
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const formatAuthError = (err: unknown): string => {
    const raw = err instanceof Error ? err.message : String(err);
    if (raw.includes('auth/invalid-credential') || raw.includes('auth/wrong-password') || raw.includes('auth/user-not-found')) {
      return 'Invalid administrator email or password.';
    }
    if (raw.includes('auth/operation-not-allowed')) {
      return 'Email/Password sign-in is disabled in Firebase Console -> Authentication -> Sign-in method. Enable it or use Google Sign-In.';
    }
    if (raw.includes('auth/popup-closed-by-user')) {
      return 'Sign-in popup was closed before completing authentication.';
    }
    if (raw.includes('auth/too-many-requests')) {
      return 'Too many failed attempts. Wait a moment or reset your password.';
    }
    return raw;
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      if (!cred.user.emailVerified) {
        setMessage({
          type: 'err',
          text: 'Your administrator email address is not verified yet. Verify your email in Firebase Auth before accessing admin tools.',
        });
        await signOut(auth);
        return;
      }
      const profile = await refreshAdminAuth();
      if (!profile) {
        setMessage({
          type: 'err',
          text: 'This Firebase account is not registered in the admins collection.',
        });
      }
    } catch (err) {
      setMessage({ type: 'err', text: formatAuthError(err) });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setSubmitting(true);
    setMessage(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      const profile = await refreshAdminAuth();
      if (!profile) {
        setMessage({
          type: 'err',
          text: 'Signed in via Google, but this account is not authorized as an INFORVERSE administrator.',
        });
      }
    } catch (err) {
      setMessage({ type: 'err', text: formatAuthError(err) });
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setMessage({
        type: 'ok',
        text: 'Password reset instructions have been sent via Firebase Authentication if the account exists.',
      });
    } catch (err) {
      setMessage({ type: 'err', text: formatAuthError(err) });
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center text-sm text-slate-500">
        Verifying Firebase Authentication session...
      </div>
    );
  }

  // Signed in with Firebase, but missing admin authorization
  if (firebaseUser && !adminProfile) {
    return (
      <div className="mx-auto max-w-md px-4 py-14">
        <div className="rounded-xl border border-amber-300 bg-white p-6 shadow-sm dark:border-amber-800 dark:bg-[#10233F]/75 sm:p-8">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <ShieldAlert className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">Access Restricted</span>
          </div>
          <h1 className="mt-2 text-xl font-bold text-[#071426] dark:text-white">
            Administrator Privileges Required
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            Signed in as <span className="font-semibold">{firebaseUser.email}</span>, but this UID does not have an active verified record in Firestore <code className="font-mono">admins/{firebaseUser.uid}</code>. Public registration is disabled.
          </p>
          <button
            type="button"
            onClick={() => void signOut(auth)}
            className="mt-5 h-10 w-full rounded-lg bg-[#071426] text-xs font-semibold text-white hover:bg-[#2878FF] dark:bg-[#2878FF]"
          >
            Sign Out & Switch Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#10233F]/75 sm:p-8">
        <div className="mb-4 overflow-hidden rounded-xl border border-slate-200 bg-[#010b1d] p-2 dark:border-slate-700">
          <img
            src={logoSrc}
            alt="INFORVERSE official logo"
            className="mx-auto h-20 w-auto object-contain"
          />
        </div>
        <div className="flex items-center gap-2 text-[#2878FF]">
          <Lock className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-wider">
            INFORVERSE Firebase Auth
          </span>
        </div>

        <h1 className="mt-2 text-2xl font-bold text-[#071426] dark:text-white">
          {mode === 'forgot' ? 'Reset Administrator Password' : 'Administrator Sign In'}
        </h1>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          {mode === 'forgot'
            ? 'Enter your Firebase administrator email to receive a password reset link.'
            : 'Protected editorial & automation console. Access is restricted to verified administrators; public registration is disabled.'}
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
              {submitting ? 'Sending...' : 'Send Reset Email'}
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
          <div className="mt-6 space-y-4">
            <form onSubmit={handleEmailLogin} className="space-y-4">
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
                  Password
                </label>
                <input
                  id="admin-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-[#F3F5F8] px-3 text-sm text-[#071426] dark:border-slate-700 dark:bg-[#071426] dark:text-white"
                />
              </div>

              {message && (
                <p className={`text-xs leading-relaxed ${message.type === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                  {message.text}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="h-10 w-full rounded-lg bg-[#2878FF] text-sm font-semibold text-white transition-colors hover:bg-[#1f63d6] disabled:opacity-60"
              >
                {submitting ? 'Signing In...' : 'Sign In with Email'}
              </button>
            </form>

            <div className="relative py-1 text-center text-[11px] text-slate-400">
              <span className="bg-white px-2 dark:bg-[#10233F]">or</span>
            </div>

            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleGoogleLogin()}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-[#071426] transition-colors hover:border-[#2878FF] dark:border-slate-700 dark:bg-[#071426] dark:text-white"
            >
              <KeyRound className="h-3.5 w-3.5 text-[#2878FF]" />
              <span>Sign In with Verified Google Account</span>
            </button>

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
          </div>
        )}
      </div>
    </div>
  );
}
