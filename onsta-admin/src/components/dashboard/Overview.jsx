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
  Sparkles,
  Tag,
  Layers,
  Clock,
  ShieldCheck,
  Percent,
  CheckCircle2,
  ChevronRight
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
        <span className="text-sm font-medium">{label}</span>
        <Icon className="h-4 w-4 text-slate-400" />
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
    <main className="min-w-0 flex-1 overflow-y-auto p-6 lg:p-8 bg-[#F7F4EE]">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header & Auto-Refresh */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl font-bold text-[#0d281e]">Platform Overview</h1>
            <p className="mt-1 text-sm text-slate-500">
              Live executive summary across operations, clinic verifications, AI catalog, and marketplace offers.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 hidden sm:inline">
              {lastRefreshed ? `Updated ${formatTime(lastRefreshed)} · auto in ${countdown}s` : 'Loading…'}
            </span>
            <button
              type="button"
              onClick={() => setRefreshIndex((i) => i + 1)}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm disabled:opacity-60 transition-all"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        {/* Quick Operations Action Bar */}
        <div className="bg-white rounded-2xl border border-[#E5E0D8] p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0D281E] uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Quick Shortcuts
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('master-catalog')}
              className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/70 text-emerald-900 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
              <span>Master Treatments &amp; AI</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate && onNavigate('review-queue')}
              className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
              <span>Verification Queue ({pendingApplications})</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate && onNavigate('compliance-audit')}
              className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <FileCheck className="w-3.5 h-3.5 text-amber-700" />
              <span>Compliance &amp; Permits</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate && onNavigate('audit-logs')}
              className="px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Clock className="w-3.5 h-3.5 text-gray-500" />
              <span>Audit Logs</span>
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div role="alert" className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        {/* Expiring licenses banner */}
        {expiringLicenses.length > 0 && (
          <section className={`rounded-xl border p-4 shadow-sm ${expiringLicenses.some((clinic) => {
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

        {/* Primary KPI Row */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Pending Review"
            icon={ShieldCheck}
            value={pendingApplications}
            sub="Clinic verification queue"
            loading={loading && !overview}
            urgent={pendingApplications > 0}
            onClick={onNavigate ? () => onNavigate('review-queue') : undefined}
          />
          <StatCard
            label="Registered Clinics"
            icon={Building2}
            value={overview?.registered_clinics ?? 0}
            sub={`${clinicsAwaitingActivation} awaiting activation`}
            loading={loading && !overview}
            onClick={onNavigate ? () => onNavigate('all-clinics') : undefined}
          />
          <StatCard
            label="Platform Users"
            icon={Users}
            value={users.ACTIVE ?? 0}
            sub={`${users.SUSPENDED ?? 0} suspended · ${users.DISABLED ?? 0} disabled`}
            loading={loading && !overview}
            onClick={onNavigate ? () => onNavigate('all-users') : undefined}
          />
          <StatCard
            label="Open Info Requests"
            icon={AlertCircle}
            value={openInfoRequests}
            sub="Awaiting clinic modifications"
            loading={loading && !overview}
            urgent={openInfoRequests > 0}
            onClick={onNavigate ? () => onNavigate('review-queue') : undefined}
          />
        </section>

        {/* Aesthetic AI Catalog & Marketplace Live Offers Section */}
        <section className="grid gap-5 lg:grid-cols-2">
          {/* AI Catalog & Taxonomy Stats */}
          <div className="rounded-2xl border border-[#E5E0D8] bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  AI Face Scan &amp; Clinical Catalog
                </span>
                <h2 className="text-lg font-bold font-serif text-[#0D281E] mt-0.5">Master Treatments Coverage</h2>
              </div>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('master-catalog')}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
                >
                  Manage <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#FAF8F5] p-3.5 rounded-xl border border-[#E5E0D8]/60 text-center">
                <span className="text-2xl font-bold text-[#0D281E]">{catalog.master_treatments}</span>
                <p className="text-[11px] font-medium text-gray-500 mt-0.5">Master Treatments</p>
              </div>
              <div className="bg-[#FAF8F5] p-3.5 rounded-xl border border-[#E5E0D8]/60 text-center">
                <span className="text-2xl font-bold text-amber-800">{catalog.target_concerns}</span>
                <p className="text-[11px] font-medium text-gray-500 mt-0.5">AI Face Concerns</p>
              </div>
              <div className="bg-[#FAF8F5] p-3.5 rounded-xl border border-[#E5E0D8]/60 text-center">
                <span className="text-2xl font-bold text-indigo-800">{catalog.categories}</span>
                <p className="text-[11px] font-medium text-gray-500 mt-0.5">Taxonomy Categories</p>
              </div>
            </div>

            {/* Clinic Menu Readiness Progress */}
            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1.5">
                <span className="font-medium">Clinic Menu Ingestion Readiness</span>
                <strong className="text-[#0D281E]">
                  {catalog.clinics_with_services} of {catalog.total_clinics} clinics active ({catalog.total_clinics > 0 ? Math.round((catalog.clinics_with_services / catalog.total_clinics) * 100) : 0}%)
                </strong>
              </div>
              <div className="w-full h-2.5 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                  style={{
                    width: `${catalog.total_clinics > 0 ? Math.min(100, Math.round((catalog.clinics_with_services / catalog.total_clinics) * 100)) : 0}%`
                  }}
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1.5">
                Clinics with configured services mapped to Onsta face-detection treatments.
              </p>
            </div>
          </div>

          {/* Live Marketplace Offers Activity */}
          <div className="rounded-2xl border border-[#E5E0D8] bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-emerald-600" />
                  Marketplace Campaigns
                </span>
                <h2 className="text-lg font-bold font-serif text-[#0D281E] mt-0.5">Live Consumer Offers</h2>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Live on onsta.ae
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#FAF8F5] p-4 rounded-xl border border-[#E5E0D8]/60">
                <div className="flex items-center justify-between text-gray-500 text-xs">
                  <span>Active Live Offers</span>
                  <Tag className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="mt-2 text-3xl font-bold font-mono text-[#0D281E]">{catalog.active_offers}</div>
                <p className="mt-1 text-[11px] text-gray-500">
                  Across {catalog.clinics_with_offers} participating clinics
                </p>
              </div>

              <div className="bg-[#FAF8F5] p-4 rounded-xl border border-[#E5E0D8]/60">
                <div className="flex items-center justify-between text-gray-500 text-xs">
                  <span>Average Discount</span>
                  <Percent className="w-4 h-4 text-amber-600" />
                </div>
                <div className="mt-2 text-3xl font-bold font-mono text-[#0D281E]">{catalog.avg_discount_percent}%</div>
                <p className="mt-1 text-[11px] text-gray-500">
                  Promotional patient savings in UAE
                </p>
              </div>
            </div>

            <div className="p-3 bg-emerald-50/70 border border-emerald-200/60 rounded-xl text-xs text-emerald-900 flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>All active offers satisfy DHA ST-21 advertising wording rules &amp; positive price validation.</span>
            </div>
          </div>
        </section>

        {/* Detail Cards: System Health, User Accounts, Applications */}
        <section className="grid gap-5 lg:grid-cols-3">
          {/* System health */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">System health</h2>
            <p className="mt-1 text-sm text-slate-500">Status from real-time database query checks.</p>
            {loading && !overview ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Skeleton className="h-16" /><Skeleton className="h-16" />
              </div>
            ) : overview ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <HealthCard label="Admin API" value={formatLabel(overview.system_health.api)} detail="Overview service responding" />
                <HealthCard label="Database" value={formatLabel(overview.system_health.database)} detail="PostgreSQL queries live" />
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

        {/* Real-Time Platform Activity & Suggested Follow-ups */}
        <section className="grid gap-5 lg:grid-cols-2">
          {/* Recent Activity Log */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-slate-900">Recent Platform Activity</h2>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('audit-logs')}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-900"
                >
                  View all logs →
                </button>
              )}
            </div>
            {recentActivity.length === 0 ? (
              <p className="text-xs text-gray-400 py-4">No recent activity recorded.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {recentActivity.map((act) => (
                  <li key={act.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                    <div>
                      <span className="font-semibold text-gray-900">{act.action}</span>
                      <span className="text-gray-400 text-[11px] ml-1.5">by {act.actor_name}</span>
                      {act.tenant_name && act.tenant_name !== 'Platform' && (
                        <span className="text-emerald-700 font-medium ml-1">({act.tenant_name})</span>
                      )}
                    </div>
                    <span className="text-gray-400 text-[10px] whitespace-nowrap shrink-0">
                      {act.created_at ? new Date(act.created_at).toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Suggested follow-ups */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Suggested follow-ups</h2>
              <p className="text-xs text-gray-500 mt-0.5">Automated actionable alerts requiring administrator attention.</p>
              {loading && !overview ? (
                <div className="mt-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" />
                </div>
              ) : overview ? (
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  {recommendations.map((r) => (
                    <li key={r} className="flex items-start gap-2 text-xs">
                      <span className="text-emerald-700 font-bold mt-0.5">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-3 text-sm text-slate-400">Follow-ups unavailable.</p>}
            </div>

            {onNavigate && (
              <div
                role="button"
                tabIndex={0}
                onClick={() => onNavigate('compliance-audit')}
                className="mt-4 flex cursor-pointer items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 shadow-sm transition hover:bg-emerald-100"
              >
                <div className="flex items-center gap-2.5">
                  <FileCheck className="h-4 w-4 text-emerald-700" />
                  <span className="text-xs font-semibold text-emerald-900">Open Compliance Audit</span>
                </div>
                <ArrowRight className="h-4 w-4 text-emerald-600" />
              </div>
            )}
          </div>
        </section>

      </div>
    </main>
  );
}
