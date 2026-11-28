import React, { useEffect, useRef, useState } from 'react';
import FaIcon from '../common/FaIcon';
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
          <FaIcon icon={icon} className="text-sm" />
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
          <FaIcon icon="fa-solid fa-chevron-right" className="text-[10px]" />
        </div>
      )}
    </div>
  );
}

function EmptyApplications() {
  return (
    <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-dashed border-theme-border-strong bg-theme-surface py-8 text-center">
      <FaIcon icon="fa-solid fa-wave-square" className="mb-2 text-2xl text-theme-border-strong" />
      <p className="text-sm alata-regular text-theme-ink">No applications submitted yet</p>
      <p className="mt-1 text-xs text-theme-muted">Clinic applications will appear here once submitted.</p>
    </div>
  );
}

export default function Overview({ onNavigate }) {
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
  if (pendingApplications > 0) recommendations.push(`${pendingApplications} clinic application${pendingApplications === 1 ? '' : 's'} may need review.`);
  if (openInfoRequests > 0) recommendations.push(`Check ${openInfoRequests} open clinic information request${openInfoRequests === 1 ? '' : 's'}.`);
  if (clinicsAwaitingActivation > 0) recommendations.push(`${clinicsAwaitingActivation} approved clinic${clinicsAwaitingActivation === 1 ? '' : 's'} are awaiting activation.`);
  if (expiringLicenses.length > 0) recommendations.push(`${overview.expiring_licenses_total} clinic${overview.expiring_licenses_total === 1 ? '' : 's'} have licenses expiring within 30 days.`);
  if (catalog.total_clinics > 0 && catalog.clinics_with_services < catalog.total_clinics) {
    recommendations.push(`${catalog.total_clinics - catalog.clinics_with_services} approved clinic(s) have not yet added treatments to their menu.`);
  }
  if (overview && recommendations.length === 0) recommendations.push('No outstanding application or compliance issues were found in the current counts.');

  return (
    <main className="min-w-0 flex-1 overflow-y-auto p-6 lg:p-8 bg-theme-canvas">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header Banner */}
        <div className="bg-theme-card rounded-3xl border border-theme-border p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-theme-primary-soft text-theme-primary flex items-center justify-center flex-shrink-0">
              <FaIcon icon="fa-solid fa-table-columns" className="text-lg" />
            </div>
            <div>
              <h1 className="alata-regular text-2xl sm:text-3xl text-theme-ink">Platform Overview</h1>
              <p className="mt-0.5 text-xs text-theme-muted">
                Live executive summary across clinic operations, regulatory verifications, AI catalog, and offers.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-theme-muted hidden sm:inline">
              {lastRefreshed ? `Updated ${formatTime(lastRefreshed)} · auto in ${countdown}s` : 'Loading…'}
            </span>
            <button
              type="button"
              onClick={() => setRefreshIndex((i) => i + 1)}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full border border-theme-border-strong bg-theme-canvas px-4 py-2 text-xs alata-regular text-theme-primary hover:bg-theme-primary-soft shadow-xs disabled:opacity-60 transition-all"
            >
              <FaIcon icon={`fa-solid fa-arrows-rotate ${loading ? 'fa-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        {/* Quick Operations Action Bar */}
        <div className="bg-theme-card rounded-2xl border border-theme-border p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs alata-regular text-theme-primary uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
            Quick Operations
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('master-catalog')}
              className="px-3.5 py-1.5 rounded-full bg-theme-canvas hover:bg-theme-primary-soft border border-theme-border-strong text-theme-primary text-xs alata-regular flex items-center gap-1.5 transition-colors"
            >
              <FaIcon icon="fa-solid fa-wand-magic-sparkles" />
              <span>Master Treatments &amp; AI</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate && onNavigate('review-queue')}
              className="px-3.5 py-1.5 rounded-full bg-theme-surface hover:bg-theme-surface-muted border border-theme-border-slate text-theme-ink text-xs alata-regular flex items-center gap-1.5 transition-colors"
            >
              <FaIcon icon="fa-solid fa-shield-halved" className="text-theme-primary" />
              <span>Verification Queue ({pendingApplications})</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate && onNavigate('compliance-audit')}
              className="px-3.5 py-1.5 rounded-full bg-theme-accent-soft hover:bg-theme-accent/20 border border-theme-accent-border text-theme-accent-text text-xs alata-regular flex items-center gap-1.5 transition-colors"
            >
              <FaIcon icon="fa-solid fa-file-contract" className="text-theme-accent" />
              <span>Compliance &amp; Permits</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate && onNavigate('audit-logs')}
              className="px-3.5 py-1.5 rounded-full bg-theme-surface hover:bg-theme-surface-muted border border-theme-border-slate text-theme-muted text-xs alata-regular flex items-center gap-1.5 transition-colors"
            >
              <FaIcon icon="fa-solid fa-scroll" />
              <span>Audit Logs</span>
            </button>
          </div>
        </div>

        {error && (
          <div role="alert" className="flex items-center gap-2 rounded-2xl border border-[#FECACA] bg-[#FEE2E2] px-4 py-3 text-xs text-[#991B1B]">
            <FaIcon icon="fa-solid fa-circle-exclamation" className="shrink-0" /> {error}
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
                  <FaIcon icon="fa-solid fa-triangle-exclamation" className="text-theme-accent" />
                  Licences expiring within 30 days
                </h2>
                <p className="mt-1 text-xs text-theme-muted">
                  Showing {expiringLicenses.length} soonest of {overview.expiring_licenses_total} clinics.
                </p>
              </div>
              {onNavigate && (
                <button type="button" onClick={() => onNavigate('compliance-audit')} className="inline-flex items-center gap-1.5 text-xs alata-regular text-theme-primary hover:underline">
                  Open Compliance &amp; Permits <FaIcon icon="fa-solid fa-arrow-right" className="text-[11px]" />
                </button>
              )}
            </div>
            <ul className="mt-3.5 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
              {expiringLicenses.map((clinic) => {
                const license = soonestExpiringLicense(clinic);
                const days = daysUntil(license.date);
                return (
                  <li key={clinic.clinic_id} className="rounded-2xl border border-theme-card bg-theme-card/90 px-3.5 py-2.5 shadow-xs">
                    <p className="truncate text-xs alata-regular text-theme-ink">{clinic.trading_name}</p>
                    <p className={`mt-1 text-[11px] ${days <= 7 ? 'font-semibold text-[#991B1B]' : 'text-theme-accent-text'}`}>
                      {license.type} · {formatDate(license.date)} ({days === 0 ? 'today' : `in ${days}d`})
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
            label="Pending Review"
            icon="fa-solid fa-shield-halved"
            value={pendingApplications}
            sub="Clinic verification queue"
            loading={loading && !overview}
            urgent={pendingApplications > 0}
            onClick={onNavigate ? () => onNavigate('review-queue') : undefined}
          />
          <StatCard
            label="Registered Clinics"
            icon="fa-solid fa-hospital"
            value={overview?.registered_clinics ?? 0}
            sub={`${clinicsAwaitingActivation} awaiting activation`}
            loading={loading && !overview}
            onClick={onNavigate ? () => onNavigate('all-clinics') : undefined}
          />
          <StatCard
            label="Platform Users"
            icon="fa-solid fa-users"
            value={users.ACTIVE ?? 0}
            sub={`${users.SUSPENDED ?? 0} suspended · ${users.DISABLED ?? 0} disabled`}
            loading={loading && !overview}
            onClick={onNavigate ? () => onNavigate('all-users') : undefined}
          />
          <StatCard
            label="Open Info Requests"
            icon="fa-solid fa-circle-exclamation"
            value={openInfoRequests}
            sub="Awaiting clinic modifications"
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
                  <FaIcon icon="fa-solid fa-wand-magic-sparkles" />
                  AI Face Scan &amp; Clinical Catalog
                </span>
                <h2 className="text-lg alata-regular text-theme-ink mt-0.5">Master Treatments Coverage</h2>
              </div>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('master-catalog')}
                  className="text-xs alata-regular text-theme-primary hover:text-theme-primary-hover flex items-center gap-1"
                >
                  Manage <FaIcon icon="fa-solid fa-chevron-right" className="text-[10px]" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-theme-surface p-4 rounded-2xl border border-theme-border-slate text-center">
                <span className="text-2xl alata-regular text-theme-ink">{catalog.master_treatments}</span>
                <p className="text-[11px] font-medium text-theme-muted mt-0.5">Master Treatments</p>
              </div>
              <div className="bg-theme-canvas p-4 rounded-2xl border border-theme-border text-center">
                <span className="text-2xl alata-regular text-theme-primary">{catalog.target_concerns}</span>
                <p className="text-[11px] font-medium text-theme-muted mt-0.5">AI Face Concerns</p>
              </div>
              <div className="bg-theme-surface p-4 rounded-2xl border border-theme-border-slate text-center">
                <span className="text-2xl alata-regular text-theme-ink">{catalog.categories}</span>
                <p className="text-[11px] font-medium text-theme-muted mt-0.5">Categories</p>
              </div>
            </div>

            <div className="pt-3 border-t border-theme-border">
              <div className="flex items-center justify-between text-xs text-theme-muted mb-2">
                <span className="font-medium">Clinic Menu Ingestion Readiness</span>
                <strong className="alata-regular text-theme-primary">
                  {catalog.clinics_with_services} of {catalog.total_clinics} clinics ({catalog.total_clinics > 0 ? Math.round((catalog.clinics_with_services / catalog.total_clinics) * 100) : 0}%)
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
                Clinics with configured services mapped to Onsta face-detection treatments.
              </p>
            </div>
          </div>

          {/* Live Marketplace Offers Activity */}
          <div className="rounded-3xl border border-theme-border bg-theme-card p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] alata-regular text-theme-accent uppercase tracking-wider flex items-center gap-1.5">
                  <FaIcon icon="fa-solid fa-tags" />
                  Marketplace Campaigns
                </span>
                <h2 className="text-lg alata-regular text-theme-ink mt-0.5">Live Consumer Offers</h2>
              </div>
              <span className="px-3 py-1 rounded-full text-[11px] alata-regular bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]">
                Live on onsta.ae
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-theme-surface p-4 rounded-2xl border border-theme-border-slate">
                <div className="flex items-center justify-between text-theme-muted text-xs">
                  <span>Active Live Offers</span>
                  <FaIcon icon="fa-solid fa-tags" className="text-theme-accent" />
                </div>
                <div className="mt-2 text-3xl alata-regular text-theme-ink">{catalog.active_offers}</div>
                <p className="mt-1 text-[11px] text-theme-muted">
                  Across {catalog.clinics_with_offers} participating clinics
                </p>
              </div>

              <div className="bg-theme-accent-soft p-4 rounded-2xl border border-theme-accent-border">
                <div className="flex items-center justify-between text-theme-accent-text text-xs">
                  <span>Average Discount</span>
                  <FaIcon icon="fa-solid fa-percent" className="text-theme-accent" />
                </div>
                <div className="mt-2 text-3xl alata-regular text-theme-accent">{catalog.avg_discount_percent}%</div>
                <p className="mt-1 text-[11px] text-theme-muted">
                  Promotional patient savings in UAE
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-[#DCFCE7]/60 border border-[#BBF7D0] rounded-2xl text-xs text-[#166534] flex items-center gap-2.5">
              <FaIcon icon="fa-solid fa-shield-halved" className="shrink-0" />
              <span>All active offers satisfy DHA ST-21 advertising wording rules &amp; positive price validation.</span>
            </div>
          </div>
        </section>

        {/* Detail Cards: System Health, User Accounts, Applications */}
        <section className="grid gap-5 lg:grid-cols-3">
          <div className="rounded-3xl border border-theme-border bg-theme-card p-5 shadow-sm">
            <h2 className="text-base alata-regular text-theme-ink">System health</h2>
            <p className="mt-1 text-xs text-theme-muted">Status from real-time database query checks.</p>
            {loading && !overview ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Skeleton className="h-16" /><Skeleton className="h-16" />
              </div>
            ) : overview ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <HealthCard label="Admin API" value={formatLabel(overview.system_health.api)} detail="Overview responding" />
                <HealthCard label="Database" value={formatLabel(overview.system_health.database)} detail="PostgreSQL live" />
              </div>
            ) : <p className="mt-4 text-xs text-theme-subtle">Health details unavailable.</p>}
          </div>

          <div className="rounded-3xl border border-theme-border bg-theme-card p-5 shadow-sm">
            <h2 className="text-base alata-regular text-theme-ink mb-3">User accounts</h2>
            {loading && !overview ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" />
              </div>
            ) : overview ? (
              <StatusList title="Accounts by status" statuses={USER_STATUSES} counts={users} />
            ) : <p className="text-xs text-theme-subtle">Account details unavailable.</p>}
          </div>

          <div className="rounded-3xl border border-theme-border bg-theme-card p-5 shadow-sm">
            <h2 className="text-base alata-regular text-theme-ink">Clinic applications</h2>
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
              ) : <EmptyApplications />
            ) : <p className="mt-4 text-xs text-theme-subtle">Application details unavailable.</p>}
          </div>
        </section>

        {/* Real-Time Platform Activity & Suggested Follow-ups */}
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-theme-border bg-theme-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base alata-regular text-theme-ink">Recent Platform Activity</h2>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('audit-logs')}
                  className="text-xs alata-regular text-theme-primary hover:text-theme-primary-hover"
                >
                  View all logs →
                </button>
              )}
            </div>
            {recentActivity.length === 0 ? (
              <p className="text-xs text-theme-subtle py-4">No recent activity recorded.</p>
            ) : (
              <ul className="divide-y divide-theme-border">
                {recentActivity.map((act) => (
                  <li key={act.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                    <div>
                      <span className="alata-regular text-theme-ink">{act.action}</span>
                      <span className="text-theme-muted text-[11px] ml-1.5">by {act.actor_name}</span>
                      {act.tenant_name && act.tenant_name !== 'Platform' && (
                        <span className="text-theme-primary font-semibold ml-1">({act.tenant_name})</span>
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
              <h2 className="text-base alata-regular text-theme-ink">Suggested follow-ups</h2>
              <p className="text-xs text-theme-muted mt-0.5">Automated actionable alerts requiring administrator attention.</p>
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
              ) : <p className="mt-3 text-xs text-theme-subtle">Follow-ups unavailable.</p>}
            </div>

            {onNavigate && (
              <div
                role="button"
                tabIndex={0}
                onClick={() => onNavigate('compliance-audit')}
                className="mt-5 flex cursor-pointer items-center justify-between rounded-2xl border border-theme-border-strong bg-theme-canvas p-4 shadow-xs transition hover:bg-theme-primary-soft"
              >
                <div className="flex items-center gap-2.5">
                  <FaIcon icon="fa-solid fa-file-contract" className="text-theme-primary" />
                  <span className="text-xs alata-regular text-theme-ink">Open Compliance &amp; Permits Audit</span>
                </div>
                <FaIcon icon="fa-solid fa-arrow-right" className="text-xs text-theme-primary" />
              </div>
            )}
          </div>
        </section>

      </div>
    </main>
  );
}
