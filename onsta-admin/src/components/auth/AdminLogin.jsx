import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppIcon from '../common/AppIcon';
import BrandLogo from '../common/BrandLogo';
import LanguageSwitcher from '../common/LanguageSwitcher';

export default function AdminLogin({ onSignedIn }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const clinicPortalUrl =
    import.meta.env.VITE_CLINIC_URL ||
    `${window.location.protocol}//${window.location.hostname}:3000/login`;

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.detail || t('auth.signInFailed', { status: response.status }));
      if (body.user?.workspace !== 'SUPER_ADMIN') throw new Error(t('auth.noAdminAccess'));
      localStorage.setItem('onsta_access_token', body.access_token);
      onSignedIn(body.user);
    } catch (err) {
      setError(err.message || t('auth.genericError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-theme-canvas px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-theme-border bg-theme-card p-8 shadow-xl sm:p-10">
        <div className="mb-7 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <BrandLogo className="w-12 h-12 rounded-2xl shadow-sm" />
            <div>
              <p className="text-xs alata-regular tracking-widest text-theme-primary">{t('common.brand')}</p>
              <p className="text-xs text-theme-muted">{t('auth.platformAdmin')}</p>
            </div>
          </div>
          <LanguageSwitcher />
        </div>

        <h1 className="text-2xl alata-regular text-theme-ink">{t('auth.signInTitle')}</h1>
        <p className="mt-1.5 text-xs text-theme-muted">{t('auth.signInSubtitle')}</p>

        {error && (
          <p role="alert" className="mt-5 rounded-2xl border border-[#FECACA] bg-[#FEE2E2] p-3.5 text-xs text-[#991B1B] flex items-center gap-2">
            <AppIcon name="warning-circle" className="text-[#DC2626]" />
            <span dir="auto">{error}</span>
          </p>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-xs font-semibold text-theme-ink">
            {t('auth.email')}
            <div className="relative mt-1.5">
              <AppIcon name="mail" className="text-xs text-theme-subtle absolute start-3.5 top-3.5" />
              <input
                required
                type="email"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-theme-border-slate bg-theme-surface focus:bg-theme-card py-2.5 ps-10 pe-3.5 text-sm outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary"
              />
            </div>
          </label>

          <label className="block text-xs font-semibold text-theme-ink">
            {t('auth.password')}
            <div className="relative mt-1.5">
              <AppIcon name="lock" className="text-xs text-theme-subtle absolute start-3.5 top-3.5" />
              <input
                required
                type="password"
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-theme-border-slate bg-theme-surface focus:bg-theme-card py-2.5 ps-10 pe-3.5 text-sm outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary"
              />
            </div>
          </label>

          <button
            disabled={busy}
            className="w-full rounded-full bg-theme-primary hover:bg-theme-primary-hover py-3 text-xs alata-regular tracking-wide text-white shadow-sm transition-all disabled:opacity-60"
          >
            {busy ? t('auth.signingIn') : t('auth.signInButton')}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-theme-muted">
          {t('auth.clinicAccountQuestion')}{' '}
          <a href={clinicPortalUrl} className="alata-regular text-theme-primary hover:underline">
            {t('auth.clinicSignInLink')}
          </a>
        </p>
      </section>
    </main>
  );
}
