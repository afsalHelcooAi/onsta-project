import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  AlertTriangle,
  Building2,
  FileCheck,
  RefreshCw,
  Users,
} from 'lucide-react';
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

/* ── Skeleton pulse block ── */
function Skeleton({ className }) {
  return <div className={`animate-pulse rounded bg-slate-100 ${className}`} />;
}

/* ── Status breakdown list ── */
function StatusList({ title, statuses, counts }) {
  const colorFor = (s) => {
    if (s === 'FAILED') return 'text-rose-700';
    if (s === 'PROCESSING') return 'text-amber-700';
    if (s === 'ACTIVE' || s === 'COMPLETED') return 'text-emerald-700';
    return 'text-slate-700';
  };
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <dl className="mt-3 space-y-2">
        {statuses.map((s) => (
          <div key={s} className="flex items-center justify-between text-sm">
            <dt className="text-slate-500">{formatLabel(s)}</dt>
            <dd className={`font-semibold ${colorFor(s)}`}>{counts[s] || 0}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* ── System health dot card ── */
function HealthCard({ label, value, detail, healthy = true }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${healthy ? 'bg-emerald-500' : 'bg-amber-500'}`} />
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      </div>
      <div className="mt-2 font-semibold text-slate-900">{value}</div>
      <p className="mt-0.5 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

/* ── Clickable KPI stat card ── */
function StatCard({ label, icon: Icon, value, sub, loading, urgent, onClick }) {
  const base = 'rounded-xl border bg-white p-5 shadow-sm transition-all';
  const interactive = onClick ? 'cursor-pointer hover:border-emerald-400 hover:shadow-md' : '';
  const border = urgent ? 'border-rose-200' : 'border-slate-200';
  return (
    <div className={`${base} ${border} ${interactive}`} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
      <div className="flex items-center justify-between text-slate-500">
        <span className="text-sm">{label}</span>
        <Icon className="h-4 w-4" />
      </div>
      {loading ? (
        <>
          <Skeleton className="mt-3 h-8 w-20" />
          <Skeleton className="mt-2 h-3 w-32" />
        </>
      ) : (
        <>
          <div className={`mt-2 text-3xl font-semibold ${urgent ? 'text-rose-700' : 'text-slate-900'}`}>{value}</div>
          <p className="mt-1 text-xs text-slate-500">{sub}</p>
        </>
      )}
      {onClick && !loading && (
        <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-emerald-700">
          Go to section <ArrowRight className="h-3 w-3" />
        </div>
      )}
    </div>
  );
}

/* ── Empty state for applications grid ── */
function EmptyApplications() {
  return (
    <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center">
      <Activity className="mb-2 h-8 w-8 text-slate-300" />
      <p className="text-sm font-medium text-slate-500">No applications submitted yet</p>
      <p className="mt-1 text-xs text-slate-400">Clinic applications will appear here once submitted.</p>
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

  /* Fetch data */
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

  /* Auto-refresh countdown */
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

  const recommendations = [];
  if (pendingApplications > 0) recommendations.push(`${pendingApplications} clinic application${pendingApplications === 1 ? '' : 's'} may need review.`);
  if (openInfoRequests > 0) recommendations.push(`Check ${openInfoRequests} open clinic information request${openInfoRequests === 1 ? '' : 's'}.`);
  if (clinicsAwaitingActivation > 0) recommendations.push(`${clinicsAwaitingActivation} approved clinic${clinicsAwaitingActivation === 1 ? '' : 's'} are awaiting activation.`);
  if (expiringLicenses.length > 0) recommendations.push(`${overview.expiring_licenses_total} clinic${overview.expiring_licenses_total === 1 ? '' : 's'} have licenses expiring within 30 days.`);
  if (overview && recommendations.length === 0) recommendations.push('No outstanding application or compliance issues were found in the current counts.');

  return (
    <main className="min-w-0 flex-1 overflow-y-auto p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl font-bold text-[#0d281e]">Platform Overview</h1>
            <p className="mt-1 text-sm text-slate-500">
              A live summary of platform health, users, clinics, and applications.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <button
              type="button"
              onClick={() => setRefreshIndex((i) => i + 1)}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <span className="text-[11px] text-slate-400">
              {lastRefreshed ? `Updated ${formatTime(lastRefreshed)} · auto in ${countdown}s` : 'Loading…'}
            </span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div role="alert" className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        {expiringLicenses.length > 0 && (
          <section className={`mb-5 rounded-xl border p-4 shadow-sm ${expiringLicenses.some((clinic) => {
            const license = soonestExpiringLicense(clinic);
            return license && daysUntil(license.date) <= 7;
          }) ? 'border-rose-200 bg-rose-50' : 'border-amber-200 bg-amber-50'}`} aria-labelledby="expiring-licenses-title">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 id="expiring-licenses-title" className="flex items-center gap-2 font-semibold text-slate-900">
                  <AlertTriangle className="h-4 w-4 text-amber-700" />
                  Licenses expiring within 30 days
                </h2>
                <p className="mt-1 text-xs text-slate-600">
                  Showing {expiringLicenses.length} soonest of {overview.expiring_licenses_total} clinics.
                </p>
              </div>
              {onNavigate && (
                <button type="button" onClick={() => onNavigate('compliance-audit')} className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-800 hover:underline">
                  Open Compliance &amp; Permits <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
              {expiringLicenses.map((clinic) => {
                const license = soonestExpiringLicense(clinic);
                const days = daysUntil(license.date);
                return (
                  <li key={clinic.clinic_id} className="rounded-lg border border-white/80 bg-white/80 px-3 py-2">
                    <p className="truncate text-sm font-semibold text-slate-800">{clinic.trading_name}</p>
                    <p className={`mt-1 text-xs ${days <= 7 ? 'font-semibold text-rose-700' : 'text-amber-800'}`}>
                      {license.type} · {formatDate(license.date)} ({days === 0 ? 'today' : `in ${days} days`})
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* KPI Cards */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6" aria-label="Platform totals">
          <StatCard
            label="User accounts"
            icon={Users}
            value={Object.values(users).reduce((s, c) => s + c, 0)}
            sub={`${users.ACTIVE || 0} active · ${users.SUSPENDED || 0} suspended`}
            loading={loading && !overview}
          />
          <StatCard
            label="Registered clinics"
            icon={Building2}
            value={overview?.registered_clinics ?? 0}
            sub="Approved clinic accounts"
            loading={loading && !overview}
          />
          <StatCard
            label="Applications to review"
            icon={Activity}
            value={pendingApplications}
            sub={`${applications.APPROVED || 0} approved · ${applications.REJECTED || 0} rejected`}
            loading={loading && !overview}
            urgent={pendingApplications > 0}
            onClick={onNavigate ? () => onNavigate('review-queue') : undefined}
          />
          <StatCard
            label="Awaiting activation"
            icon={Building2}
            value={overview?.clinics_awaiting_activation ?? 0}
            sub="Approved clinics not yet active"
            loading={loading && !overview}
          />
          <StatCard
            label="New clinics this month"
            icon={Building2}
            value={overview?.new_clinics_this_month ?? 0}
            sub="Clinics approved this month"
            loading={loading && !overview}
          />
          <StatCard
            label="Open info requests"
            icon={FileCheck}
            value={openInfoRequests}
            sub="Awaiting response or resolution"
            loading={loading && !overview}
            urgent={openInfoRequests > 0}
          />
        </section>

        {/* Detail cards */}
        <section className="mt-5 grid gap-5 lg:grid-cols-3">
          {/* System health */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">System health</h2>
            <p className="mt-1 text-sm text-slate-500">Service status from this overview request and its database checks.</p>
            {loading && !overview ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Skeleton className="h-16" /><Skeleton className="h-16" />
              </div>
            ) : overview ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <HealthCard label="Admin API" value={formatLabel(overview.system_health.api)} detail="Overview service responding" />
                <HealthCard label="Database" value={formatLabel(overview.system_health.database)} detail="Live platform queries succeeded" />
              </div>
            ) : <p className="mt-4 text-sm text-slate-400">Health details unavailable.</p>}
          </div>

          {/* User accounts */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">User accounts</h2>
            {loading && !overview ? (
              <div className="mt-4 space-y-2">
                <Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" />
              </div>
            ) : overview ? (
              <div className="mt-4"><StatusList title="Accounts by status" statuses={USER_STATUSES} counts={users} /></div>
            ) : <p className="mt-4 text-sm text-slate-400">Account details unavailable.</p>}
          </div>

          {/* Clinic applications */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Clinic applications</h2>
            {loading && !overview ? (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Skeleton className="h-14" /><Skeleton className="h-14" /><Skeleton className="h-14" /><Skeleton className="h-14" />
              </div>
            ) : overview ? (
              hasApplications ? (
                <dl className="mt-4 grid grid-cols-2 gap-3">
                  {Object.entries(applications).sort(([a], [b]) => a.localeCompare(b)).map(([status, count]) => (
                    <div key={status} className="rounded-lg bg-slate-50 px-3 py-2">
                      <dt className="text-xs text-slate-500">{formatLabel(status)}</dt>
                      <dd className="mt-1 text-lg font-semibold text-slate-900">{count}</dd>
                    </div>
                  ))}
                </dl>
              ) : <EmptyApplications />
            ) : <p className="mt-4 text-sm text-slate-400">Application details unavailable.</p>}
          </div>
        </section>

        {/* Compliance & Permits shortcut */}
        {onNavigate && (
          <div
            role="button"
            tabIndex={0}
            onClick={() => onNavigate('compliance-audit')}
            className="mt-5 flex cursor-pointer items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm transition hover:bg-emerald-100"
          >
            <div className="flex items-center gap-3">
              <FileCheck className="h-5 w-5 text-emerald-700" />
              <div>
                <h2 className="text-base font-semibold text-emerald-900">Compliance & Permits</h2>
                <p className="mt-0.5 text-xs text-emerald-700">Review trade and facility license expiry across all registered clinics.</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-emerald-600" />
          </div>
        )}

        {/* Suggested follow-ups */}
        <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Suggested follow-ups</h2>
          {loading && !overview ? (
            <div className="mt-3 space-y-2">
              <Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" />
            </div>
          ) : overview ? (
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {recommendations.map((r) => (
                <li key={r} className="flex gap-2"><span className="text-emerald-700">•</span>{r}</li>
              ))}
            </ul>
          ) : <p className="mt-3 text-sm text-slate-400">Follow-ups unavailable.</p>}
        </section>

      </div>
    </main>
  );
}
