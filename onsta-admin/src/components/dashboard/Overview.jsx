import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppIcon from '../common/AppIcon';
import { fetchAdminOverview } from '../../api/adminApi';

const USER_STATUSES = ['ACTIVE', 'SUSPENDED', 'DISABLED'];
const AUTO_REFRESH_SECONDS = 60;

function formatLabel(value) {
  return value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatTime(date) {
  if (!date) return null;
  return date.toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDate(value) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-AE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysUntil(value) {
  const [year, month, day] = value.split('-').map(Number);
  const expiry = Date.UTC(year, month - 1, day);
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.ceil((expiry - today) / 86400000);
}

function soonestExpiringLicense(clinic) {
  return [
    { type: 'Trade license', date: clinic.trade_license_expiry_date },
    { type: 'Facility license', date: clinic.facility_license_expiry_date },
  ].filter((license) => license.date).sort((left, right) => left.date.localeCompare(right.date))[0];
}

function Skeleton({ className }) {
  return <div className={`animate-pulse rounded-xl bg-theme-primary-soft/60 ${className}`} />;
}

function StatusList({ title, statuses, counts }) {
  const colorFor = (s) => {
    if (s === 'FAILED') return 'text-[#991B1B]';
    if (s === 'PROCESSING') return 'text-theme-accent-text';
    if (s === 'ACTIVE' || s === 'COMPLETED') return 'text-[#166534]';
    return 'text-theme-muted';
  };
  return (
    <div>
      <h3 className="text-xs alata-regular uppercase tracking-wider text-theme-muted">{title}</h3>
      <dl className="mt-3 space-y-2.5">
        {statuses.map((s) => (
          <div key={s} className="flex items-center justify-between text-xs py-1 border-b border-theme-border last:border-0">
            <dt className="text-theme-muted font-medium">{formatLabel(s)}</dt>
            <dd className={`alata-regular text-sm ${colorFor(s)}`}>{counts[s] || 0}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function HealthCard({ label, value, detail, healthy = true }) {
  return (
    <div className="rounded-2xl border border-theme-border-slate bg-theme-surface p-3.5">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${healthy ? 'bg-[#16A34A]' : 'bg-[#EA580C]'}`} />
        <span className="text-[10px] alata-regular uppercase tracking-wider text-theme-muted">{label}</span>
      </div>
      <div className="mt-2 alata-regular text-sm text-theme-ink">{value}</div>
      <p className="mt-0.5 text-[11px] text-theme-muted">{detail}</p>
    </div>
  );
}

function StatCard({ label, icon, value, sub, loading, urgent, onClick }) {
  const base = 'rounded-2xl border bg-theme-card p-5 shadow-sm transition-all';
  const interactive = onClick ? 'cursor-pointer hover:border-theme-border-strong hover:shadow-md hover:-translate-y-0.5 group' : '';
  const border = urgent ? 'border-[#FECACA]' : 'border-theme-border';
  return (
    <div className={`${base} ${border} ${interactive}`} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-theme-muted">{label}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
          urgent
            ? 'bg-[#FEE2E2] text-[#991B1B]'
            : 'bg-theme-primary-soft text-theme-primary group-hover:bg-theme-primary group-hover:text-white'
        }`}>
          <AppIcon name={icon} className="text-sm" />
        </div>
      </div>
      {loading ? (
        <>
          <Skeleton className="mt-2 h-8 w-20" />
          <Skeleton className="mt-2 h-3 w-32" />
        </>
      ) : (
        <>
          <div className={`text-3xl alata-regular ${urgent ? 'text-[#991B1B]' : 'text-theme-ink'}`}>{value}</div>
          <p className="mt-1 text-xs text-theme-muted">{sub}</p>
        </>
      )}
      {onClick && !loading && (
        <div className="mt-3 pt-2.5 border-t border-theme-border flex items-center justify-between text-[11px] alata-regular text-theme-primary">
          <span>Open section</span>
          <AppIcon name="caret-right" className="text-[10px]" />
        </div>
      )}
    </div>
  );
}

function EmptyApplications({ t }) {
  return (
    <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-dashed border-theme-border-strong bg-theme-surface py-8 text-center">
      <AppIcon name="waveform" className="mb-2 text-2xl text-theme-border-strong" />
      <p className="text-sm alata-regular text-theme-ink">{t('overview.noApplications')}</p>
      <p className="mt-1 text-xs text-theme-muted">{t('overview.noApplicationsSub')}</p>
    </div>
  );
}

export default function Overview({ onNavigate }) {
  const { t } = useTranslation();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [countdown, setCountdown] = useState(AUTO_REFRESH_SECONDS);
  const countdownRef = useRef(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    fetchAdminOverview()
      .then((result) => { if (active) { setOverview(result); setLastRefreshed(new Date()); } })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refreshIndex]);

  useEffect(() => {
    setCountdown(AUTO_REFRESH_SECONDS);
    clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setRefreshIndex((i) => i + 1);
          return AUTO_REFRESH_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [refreshIndex]);

  const users = overview?.users || {};
  const applications = overview?.applications || {};
  const expiringLicenses = overview?.expiring_licenses || [];
  const openInfoRequests = overview?.open_info_requests || 0;
  const clinicsAwaitingActivation = overview?.clinics_awaiting_activation || 0;
  const pendingApplications = ['SUBMITTED', 'UNDER_REVIEW', 'READY_FOR_REVIEW']
    .reduce((sum, s) => sum + (applications[s] || 0), 0);
  const hasApplications = Object.keys(applications).length > 0;

  const catalog = overview?.catalog_summary || {
    master_treatments: 0,
    categories: 0,
    target_concerns: 0,
    active_offers: 0,
    avg_discount_percent: 0,
    clinics_with_services: 0,
    clinics_with_offers: 0,
    total_clinics: 0
  };

  const recentActivity = overview?.recent_activity || [];

  const recommendations = [];
  if (pendingApplications > 0) recommendations.push(t('overview.recPending', { count: pendingApplications }));
  if (openInfoRequests > 0) recommendations.push(t('overview.recInfoRequests', { count: openInfoRequests }));
  if (clinicsAwaitingActivation > 0) recommendations.push(t('overview.recAwaitingActivation', { count: clinicsAwaitingActivation }));
  if (expiringLicenses.length > 0) recommendations.push(t('overview.recExpiring', { count: overview.expiring_licenses_total }));
  if (catalog.total_clinics > 0 && catalog.clinics_with_services < catalog.total_clinics) {
    recommendations.push(t('overview.recMissingMenus', { count: catalog.total_clinics - catalog.clinics_with_services }));
  }
  if (overview && recommendations.length === 0) recommendations.push(t('overview.recAllClear'));

  return (
    <main className="min-w-0 flex-1 overflow-y-auto p-6 lg:p-8 bg-theme-canvas">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header Banner */}
        <div className="bg-theme-card rounded-3xl border border-theme-border p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-theme-primary-soft text-theme-primary flex items-center justify-center flex-shrink-0">
              <AppIcon name="overview" className="text-lg" />
            </div>
            <div>
              <h1 className="alata-regular text-2xl sm:text-3xl text-theme-ink">{t('overview.title')}</h1>
              <p className="mt-0.5 text-xs text-theme-muted">
                {t('overview.subtitle')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-theme-muted hidden sm:inline">
              {lastRefreshed ? t('overview.updatedAuto', { time: formatTime(lastRefreshed), seconds: countdown }) : t('common.loading')}
            </span>
            <button
              type="button"
              onClick={() => setRefreshIndex((i) => i + 1)}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full border border-theme-border-strong bg-theme-canvas px-4 py-2 text-xs alata-regular text-theme-primary hover:bg-theme-primary-soft shadow-xs disabled:opacity-60 transition-all"
            >
              <AppIcon name="refresh" spin={loading} /> {t('common.refresh')}
            </button>
          </div>
        </div>

        {/* Quick Operations Action Bar */}
        <div className="bg-theme-card rounded-2xl border border-theme-border p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs alata-regular text-theme-primary uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
            {t('overview.quickOperations')}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('master-catalog')}
              className="px-3.5 py-1.5 rounded-full bg-theme-canvas hover:bg-theme-primary-soft border border-theme-border-strong text-theme-primary text-xs alata-regular flex items-center gap-1.5 transition-colors"
            >
              <AppIcon name="ai" />
              <span>{t('overview.masterTreatmentsAi')}</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate && onNavigate('review-queue')}
              className="px-3.5 py-1.5 rounded-full bg-theme-surface hover:bg-theme-surface-muted border border-theme-border-slate text-theme-ink text-xs alata-regular flex items-center gap-1.5 transition-colors"
            >
              <AppIcon name="shield-check" className="text-theme-primary" />
              <span>{t('overview.verificationQueueCount', { count: pendingApplications })}</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate && onNavigate('compliance-audit')}
              className="px-3.5 py-1.5 rounded-full bg-theme-accent-soft hover:bg-theme-accent/20 border border-theme-accent-border text-theme-accent-text text-xs alata-regular flex items-center gap-1.5 transition-colors"
            >
              <AppIcon name="file-contract" className="text-theme-accent" />
              <span>{t('overview.compliancePermits')}</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate && onNavigate('audit-logs')}
              className="px-3.5 py-1.5 rounded-full bg-theme-surface hover:bg-theme-surface-muted border border-theme-border-slate text-theme-muted text-xs alata-regular flex items-center gap-1.5 transition-colors"
            >
              <AppIcon name="scroll" />
              <span>{t('overview.auditLogs')}</span>
            </button>
          </div>
        </div>

        {error && (
          <div role="alert" className="flex items-center gap-2 rounded-2xl border border-[#FECACA] bg-[#FEE2E2] px-4 py-3 text-xs text-[#991B1B]">
            <AppIcon name="warning-circle" className="shrink-0" /> <span dir="auto">{error}</span>
          </div>
        )}

        {/* Expiring licenses banner */}
        {expiringLicenses.length > 0 && (
          <section className={`rounded-3xl border p-5 shadow-sm ${expiringLicenses.some((clinic) => {
            const license = soonestExpiringLicense(clinic);
            return license && daysUntil(license.date) <= 7;
          }) ? 'border-[#FECACA] bg-[#FFF5F5]' : 'border-theme-accent-border bg-theme-accent-soft'}`} aria-labelledby="expiring-licenses-title">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 id="expiring-licenses-title" className="flex items-center gap-2 alata-regular text-base text-theme-ink">
                  <AppIcon name="warning" className="text-theme-accent" />
                  {t('overview.expiringTitle')}
                </h2>
                <p className="mt-1 text-xs text-theme-muted">
                  {t('overview.expiringSub', { shown: expiringLicenses.length, total: overview.expiring_licenses_total })}
                </p>
              </div>
              {onNavigate && (
                <button type="button" onClick={() => onNavigate('compliance-audit')} className="inline-flex items-center gap-1.5 text-xs alata-regular text-theme-primary hover:underline">
                  {t('overview.openCompliance')} <AppIcon name="arrow-right" className="text-[11px] rtl:rotate-180" />
                </button>
              )}
            </div>
            <ul className="mt-3.5 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
              {expiringLicenses.map((clinic) => {
                const license = soonestExpiringLicense(clinic);
                const days = daysUntil(license.date);
                const licenseLabel = license.type === 'Trade license' ? t('overview.tradeLicense') : t('overview.facilityLicense');
                return (
                  <li key={clinic.clinic_id} className="rounded-2xl border border-theme-card bg-theme-card/90 px-3.5 py-2.5 shadow-xs">
                    <p dir="auto" className="truncate text-xs alata-regular text-theme-ink">{clinic.trading_name}</p>
                    <p className={`mt-1 text-[11px] ${days <= 7 ? 'font-semibold text-[#991B1B]' : 'text-theme-accent-text'}`}>
                      {licenseLabel} · {formatDate(license.date)} ({days === 0 ? t('overview.today') : t('overview.inDays', { days })})
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Primary KPI Row */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={t('overview.pendingReview')}
            icon="shield-check"
            value={pendingApplications}
            sub={t('overview.clinicVerificationQueue')}
            loading={loading && !overview}
            urgent={pendingApplications > 0}
            onClick={onNavigate ? () => onNavigate('review-queue') : undefined}
          />
          <StatCard
            label={t('overview.registeredClinics')}
            icon="hospital"
            value={overview?.registered_clinics ?? 0}
            sub={t('overview.awaitingActivation', { count: clinicsAwaitingActivation })}
            loading={loading && !overview}
            onClick={onNavigate ? () => onNavigate('all-clinics') : undefined}
          />
          <StatCard
            label={t('overview.platformUsers')}
            icon="users"
            value={users.ACTIVE ?? 0}
            sub={t('overview.usersSub', { suspended: users.SUSPENDED ?? 0, disabled: users.DISABLED ?? 0 })}
            loading={loading && !overview}
            onClick={onNavigate ? () => onNavigate('all-users') : undefined}
          />
          <StatCard
            label={t('overview.openInfoRequests')}
            icon="warning-circle"
            value={openInfoRequests}
            sub={t('overview.awaitingModifications')}
            loading={loading && !overview}
            urgent={openInfoRequests > 0}
            onClick={onNavigate ? () => onNavigate('review-queue') : undefined}
          />
        </section>

        {/* Aesthetic AI Catalog & Marketplace Live Offers Section */}
        <section className="grid gap-6 lg:grid-cols-2">
          {/* AI Catalog & Taxonomy Stats */}
          <div className="rounded-3xl border border-theme-border bg-theme-card p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] alata-regular text-theme-primary uppercase tracking-wider flex items-center gap-1.5">
                  <AppIcon name="ai" />
                  {t('overview.aiFaceCatalog')}
                </span>
                <h2 className="text-lg alata-regular text-theme-ink mt-0.5">{t('overview.masterTreatmentsCoverage')}</h2>
              </div>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('master-catalog')}
                  className="text-xs alata-regular text-theme-primary hover:text-theme-primary-hover flex items-center gap-1"
                >
                  {t('overview.manage')} <AppIcon name="caret-right" className="text-[10px] rtl:rotate-180" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-theme-surface p-4 rounded-2xl border border-theme-border-slate text-center">
                <span className="text-2xl alata-regular text-theme-ink">{catalog.master_treatments}</span>
                <p className="text-[11px] font-medium text-theme-muted mt-0.5">{t('overview.masterTreatments')}</p>
              </div>
              <div className="bg-theme-canvas p-4 rounded-2xl border border-theme-border text-center">
                <span className="text-2xl alata-regular text-theme-primary">{catalog.target_concerns}</span>
                <p className="text-[11px] font-medium text-theme-muted mt-0.5">{t('overview.aiFaceConcerns')}</p>
              </div>
              <div className="bg-theme-surface p-4 rounded-2xl border border-theme-border-slate text-center">
                <span className="text-2xl alata-regular text-theme-ink">{catalog.categories}</span>
                <p className="text-[11px] font-medium text-theme-muted mt-0.5">{t('overview.categories')}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-theme-border">
              <div className="flex items-center justify-between text-xs text-theme-muted mb-2">
                <span className="font-medium">{t('overview.ingestionReadiness')}</span>
                <strong className="alata-regular text-theme-primary">
                  {t('overview.clinicsProgress', {
                    ready: catalog.clinics_with_services,
                    total: catalog.total_clinics,
                    percent: catalog.total_clinics > 0 ? Math.round((catalog.clinics_with_services / catalog.total_clinics) * 100) : 0,
                  })}
                </strong>
              </div>
              <div className="w-full h-2.5 rounded-full bg-theme-canvas overflow-hidden">
                <div
                  className="h-full bg-theme-primary rounded-full transition-all duration-500"
                  style={{
                    width: `${catalog.total_clinics > 0 ? Math.min(100, Math.round((catalog.clinics_with_services / catalog.total_clinics) * 100)) : 0}%`
                  }}
                />
              </div>
              <p className="text-[11px] text-theme-subtle mt-1.5">
                {t('overview.ingestionHint')}
              </p>
            </div>
          </div>

          {/* Live Marketplace Offers Activity */}
          <div className="rounded-3xl border border-theme-border bg-theme-card p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] alata-regular text-theme-accent uppercase tracking-wider flex items-center gap-1.5">
                  <AppIcon name="tag" />
                  {t('overview.marketplaceCampaigns')}
                </span>
                <h2 className="text-lg alata-regular text-theme-ink mt-0.5">{t('overview.liveConsumerOffers')}</h2>
              </div>
              <span className="px-3 py-1 rounded-full text-[11px] alata-regular bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]">
                {t('overview.liveOnOnsta')}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-theme-surface p-4 rounded-2xl border border-theme-border-slate">
                <div className="flex items-center justify-between text-theme-muted text-xs">
                  <span>{t('overview.activeLiveOffers')}</span>
                  <AppIcon name="tag" className="text-theme-accent" />
                </div>
                <div className="mt-2 text-3xl alata-regular text-theme-ink">{catalog.active_offers}</div>
                <p className="mt-1 text-[11px] text-theme-muted">
                  {t('overview.participatingClinics', { count: catalog.clinics_with_offers })}
                </p>
              </div>

              <div className="bg-theme-accent-soft p-4 rounded-2xl border border-theme-accent-border">
                <div className="flex items-center justify-between text-theme-accent-text text-xs">
                  <span>{t('overview.avgDiscount')}</span>
                  <AppIcon name="percent" className="text-theme-accent" />
                </div>
                <div className="mt-2 text-3xl alata-regular text-theme-accent">{catalog.avg_discount_percent}%</div>
                <p className="mt-1 text-[11px] text-theme-muted">
                  {t('overview.patientSavings')}
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-[#DCFCE7]/60 border border-[#BBF7D0] rounded-2xl text-xs text-[#166534] flex items-center gap-2.5">
              <AppIcon name="shield-check" className="shrink-0" />
              <span>{t('overview.offersComplianceNote')}</span>
            </div>
          </div>
        </section>

        {/* Detail Cards: System Health, User Accounts, Applications */}
        <section className="grid gap-5 lg:grid-cols-3">
          <div className="rounded-3xl border border-theme-border bg-theme-card p-5 shadow-sm">
            <h2 className="text-base alata-regular text-theme-ink">{t('overview.systemHealth')}</h2>
            <p className="mt-1 text-xs text-theme-muted">{t('overview.systemHealthSub')}</p>
            {loading && !overview ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Skeleton className="h-16" /><Skeleton className="h-16" />
              </div>
            ) : overview ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <HealthCard label={t('overview.adminApi')} value={formatLabel(overview.system_health.api)} detail={t('overview.overviewResponding')} />
                <HealthCard label={t('overview.database')} value={formatLabel(overview.system_health.database)} detail={t('overview.postgresLive')} />
              </div>
            ) : <p className="mt-4 text-xs text-theme-subtle">{t('overview.healthUnavailable')}</p>}
          </div>

          <div className="rounded-3xl border border-theme-border bg-theme-card p-5 shadow-sm">
            <h2 className="text-base alata-regular text-theme-ink mb-3">{t('overview.userAccounts')}</h2>
            {loading && !overview ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" />
              </div>
            ) : overview ? (
              <StatusList title={t('overview.accountsByStatus')} statuses={USER_STATUSES} counts={users} />
            ) : <p className="text-xs text-theme-subtle">{t('overview.accountUnavailable')}</p>}
          </div>

          <div className="rounded-3xl border border-theme-border bg-theme-card p-5 shadow-sm">
            <h2 className="text-base alata-regular text-theme-ink">{t('overview.clinicApplications')}</h2>
            {loading && !overview ? (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Skeleton className="h-14" /><Skeleton className="h-14" /><Skeleton className="h-14" /><Skeleton className="h-14" />
              </div>
            ) : overview ? (
              hasApplications ? (
                <dl className="mt-4 grid grid-cols-2 gap-3">
                  {Object.entries(applications).sort(([a], [b]) => a.localeCompare(b)).map(([status, count]) => (
                    <div key={status} className="rounded-2xl bg-theme-surface border border-theme-border-slate px-3.5 py-2.5">
                      <dt className="text-[11px] text-theme-muted">{formatLabel(status)}</dt>
                      <dd className="mt-1 text-lg alata-regular text-theme-ink">{count}</dd>
                    </div>
                  ))}
                </dl>
              ) : <EmptyApplications t={t} />
            ) : <p className="mt-4 text-xs text-theme-subtle">{t('overview.applicationUnavailable')}</p>}
          </div>
        </section>

        {/* Real-Time Platform Activity & Suggested Follow-ups */}
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-theme-border bg-theme-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base alata-regular text-theme-ink">{t('overview.recentActivity')}</h2>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('audit-logs')}
                  className="text-xs alata-regular text-theme-primary hover:text-theme-primary-hover"
                >
                  {t('overview.viewAllLogs')}
                </button>
              )}
            </div>
            {recentActivity.length === 0 ? (
              <p className="text-xs text-theme-subtle py-4">{t('overview.noRecentActivity')}</p>
            ) : (
              <ul className="divide-y divide-theme-border">
                {recentActivity.map((act) => (
                  <li key={act.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                    <div>
                      <span dir="auto" className="alata-regular text-theme-ink">{act.action}</span>
                      <span className="text-theme-muted text-[11px] ms-1.5">{t('overview.byActor', { name: act.actor_name })}</span>
                      {act.tenant_name && act.tenant_name !== 'Platform' && (
                        <span dir="auto" className="text-theme-primary font-semibold ms-1">({act.tenant_name})</span>
                      )}
                    </div>
                    <span className="text-theme-subtle text-[10px] whitespace-nowrap shrink-0">
                      {act.created_at ? new Date(act.created_at).toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-3xl border border-theme-border bg-theme-card p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-base alata-regular text-theme-ink">{t('overview.suggestedFollowups')}</h2>
              <p className="text-xs text-theme-muted mt-0.5">{t('overview.suggestedFollowupsSub')}</p>
              {loading && !overview ? (
                <div className="mt-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" />
                </div>
              ) : overview ? (
                <ul className="mt-4 space-y-2.5 text-xs text-theme-ink">
                  {recommendations.map((r) => (
                    <li key={r} className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-theme-primary mt-1.5 shrink-0" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-3 text-xs text-theme-subtle">{t('overview.followupsUnavailable')}</p>}
            </div>

            {onNavigate && (
              <div
                role="button"
                tabIndex={0}
                onClick={() => onNavigate('compliance-audit')}
                className="mt-5 flex cursor-pointer items-center justify-between rounded-2xl border border-theme-border-strong bg-theme-canvas p-4 shadow-xs transition hover:bg-theme-primary-soft"
              >
                <div className="flex items-center gap-2.5">
                  <AppIcon name="file-contract" className="text-theme-primary" />
                  <span className="text-xs alata-regular text-theme-ink">{t('overview.openComplianceAudit')}</span>
                </div>
                <AppIcon name="arrow-right" className="text-xs text-theme-primary rtl:rotate-180" />
              </div>
            )}
          </div>
        </section>

      </div>
    </main>
  );
}
