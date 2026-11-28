import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AppIcon from '../common/AppIcon';
import BrandLogo from '../common/BrandLogo';
import { useClinic } from '../../context/ClinicContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useClinic();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const adminPortalUrl =
    import.meta.env.VITE_ADMIN_URL ||
    `${window.location.protocol}//${window.location.hostname}:3001`;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const session = await login(email, password);
      if (session.user.workspace !== 'CLINIC') {
        setError('This is the clinic sign-in. Use the Super Admin sign-in portal for this account.');
        return;
      }
      navigate(session.application ? '/application' : '/dashboard/overview', { replace: true });
    } catch (err) {
      setError(err.message || 'Could not sign in. Check your email and password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-theme-canvas px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-theme-border bg-theme-card p-8 shadow-xl sm:p-10">
        <div className="mb-8 flex items-center gap-3.5">
          <BrandLogo className="h-12 w-12 rounded-2xl shadow-sm" />
          <div>
            <div className="alata-regular text-xs tracking-[0.2em] text-theme-primary uppercase">ONSTA</div>
            <div className="text-sm text-theme-muted">Clinic partner portal</div>
          </div>
        </div>

        {location.state?.registered && (
          <p role="status" className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-900 flex items-start gap-2.5">
            <AppIcon name="check-circle" className="mt-0.5 shrink-0 text-emerald-700" />
            <span>Your clinic application was submitted. Sign in to check its review status.</span>
          </p>
        )}

        <h1 className="alata-regular text-3xl text-theme-ink">Clinic sign in</h1>
        <p className="mt-2 text-sm text-theme-muted">
          Your account role and clinic access are checked securely after sign in.
        </p>

        {error && (
          <p role="alert" className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800 flex items-start gap-2.5">
            <AppIcon name="warning-circle" className="mt-0.5 shrink-0 text-rose-600" />
            <span>{error}</span>
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-theme-muted">
            Email address
            <div className="relative mt-1.5">
              <AppIcon name="mail" className="absolute left-3.5 top-3.5 text-sm text-theme-muted" />
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="clinic@example.ae"
                className="w-full rounded-xl border border-theme-border bg-theme-surface py-2.5 pl-10 pr-3.5 text-sm font-normal text-theme-ink outline-none transition focus:border-theme-primary focus:bg-theme-card focus:ring-2 focus:ring-theme-primary/15"
              />
            </div>
          </label>

          <label className="block text-xs font-semibold uppercase tracking-wider text-theme-muted">
            Password
            <div className="relative mt-1.5">
              <AppIcon name="lock" className="absolute left-3.5 top-3.5 text-sm text-theme-muted" />
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-theme-border bg-theme-surface py-2.5 pl-10 pr-3.5 text-sm font-normal text-theme-ink outline-none transition focus:border-theme-primary focus:bg-theme-card focus:ring-2 focus:ring-theme-primary/15"
              />
            </div>
          </label>

          <button
            disabled={busy}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-theme-primary py-3 text-sm alata-regular text-white shadow-sm transition hover:bg-theme-primary-hover disabled:opacity-60"
          >
            {busy ? (
              <>
                <AppIcon name="spinner" spin />
                <span>Signing in…</span>
              </>
            ) : (
              <>
                <span>Sign in</span>
                <AppIcon name="arrow-right" className="text-xs" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 border-t border-theme-border pt-5 text-center text-sm text-theme-muted">
          New to ONSTA?{' '}
          <Link to="/register" className="alata-regular text-theme-primary hover:text-theme-primary-hover hover:underline">
            Register your clinic
          </Link>
        </div>

        <p className="mt-3 text-center text-xs text-theme-muted">
          Super Admins use the{' '}
          <a href={adminPortalUrl} className="alata-regular text-theme-primary underline hover:text-theme-primary-hover">
            admin portal
          </a>
          .
        </p>
      </div>
    </main>
  );
}
