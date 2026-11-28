import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppIcon from '../common/AppIcon';
import BrandLogo from '../common/BrandLogo';
import LanguageSwitcher from '../common/LanguageSwitcher';
import { useClinic } from '../../context/ClinicContext';

export default function LoginPage() {
  const { t } = useTranslation();
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
        setError(t('auth.wrongWorkspace'));
        return;
      }
      navigate(session.application ? '/application' : '/dashboard/overview', { replace: true });
    } catch (err) {
      setError(err.message || t('auth.signInFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-theme-canvas px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-theme-border bg-theme-card p-8 shadow-xl sm:p-10">
        <div className="mb-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <BrandLogo className="h-12 w-12 rounded-2xl shadow-sm" />
            <div>
              <div className="alata-regular text-xs tracking-[0.2em] text-theme-primary uppercase">{t('common.brand')}</div>
              <div className="text-sm text-theme-muted">{t('auth.clinicPortal')}</div>
            </div>
          </div>
          <LanguageSwitcher />
        </div>

        {location.state?.registered && (
          <p role="status" className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-900 flex items-start gap-2.5">
            <AppIcon name="check-circle" className="mt-0.5 shrink-0 text-emerald-700" />
            <span>{t('auth.registeredBanner')}</span>
          </p>
        )}

        <h1 className="alata-regular text-3xl text-theme-ink">{t('auth.signInTitle')}</h1>
        <p className="mt-2 text-sm text-theme-muted">
          {t('auth.signInSubtitle')}
        </p>

        {error && (
          <p role="alert" className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800 flex items-start gap-2.5">
            <AppIcon name="warning-circle" className="mt-0.5 shrink-0 text-rose-600" />
            <span dir="auto">{error}</span>
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-theme-muted">
            {t('auth.emailLabel')}
            <div className="relative mt-1.5">
              <AppIcon name="mail" className="absolute start-3.5 top-3.5 text-sm text-theme-muted" />
              <input
                required
                type="email"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.emailPlaceholder')}
                className="w-full rounded-xl border border-theme-border bg-theme-surface py-2.5 ps-10 pe-3.5 text-sm font-normal text-theme-ink outline-none transition focus:border-theme-primary focus:bg-theme-card focus:ring-2 focus:ring-theme-primary/15"
              />
            </div>
          </label>

          <label className="block text-xs font-semibold uppercase tracking-wider text-theme-muted">
            {t('auth.passwordLabel')}
            <div className="relative mt-1.5">
              <AppIcon name="lock" className="absolute start-3.5 top-3.5 text-sm text-theme-muted" />
              <input
                required
                type="password"
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-theme-border bg-theme-surface py-2.5 ps-10 pe-3.5 text-sm font-normal text-theme-ink outline-none transition focus:border-theme-primary focus:bg-theme-card focus:ring-2 focus:ring-theme-primary/15"
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
                <span>{t('auth.signingIn')}</span>
              </>
            ) : (
              <>
                <span>{t('auth.signInButton')}</span>
                <AppIcon name="arrow-right" className="text-xs rtl:rotate-180" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 border-t border-theme-border pt-5 text-center text-sm text-theme-muted">
          {t('auth.newToOnsta')}{' '}
          <Link to="/register" className="alata-regular text-theme-primary hover:text-theme-primary-hover hover:underline">
            {t('auth.registerClinic')}
          </Link>
        </div>

        <p className="mt-3 text-center text-xs text-theme-muted">
          {t('auth.superAdminPrefix')}{' '}
          <a href={adminPortalUrl} className="alata-regular text-theme-primary underline hover:text-theme-primary-hover">
            {t('auth.adminPortalLink')}
          </a>
          .
        </p>
      </div>
    </main>
  );
}
