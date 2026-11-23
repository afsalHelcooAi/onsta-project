import React, { useEffect, useState } from 'react';
import { AlertCircle, Activity, Building2, RefreshCw, Sparkles, Users } from 'lucide-react';
import { fetchAdminOverview } from '../../api/adminApi';

const USER_STATUSES = ['ACTIVE', 'INVITED', 'SUSPENDED', 'DISABLED'];
const AI_STATUSES = ['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'];

function formatLabel(value) {
  return value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function StatusList({ title, statuses, counts, color = 'slate' }) {
  const colors = {
    slate: 'text-slate-700',
    emerald: 'text-emerald-700',
    amber: 'text-amber-700',
    rose: 'text-rose-700',
  };
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <dl className="mt-3 space-y-2">
        {statuses.map((status) => (
          <div key={status} className="flex items-center justify-between text-sm">
            <dt className="text-slate-500">{formatLabel(status)}</dt>
            <dd className={`font-semibold ${status === 'FAILED' ? colors.rose : status === 'PROCESSING' ? colors.amber : colors[color]}`}>
              {counts[status] || 0}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

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

export default function Overview() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    fetchAdminOverview()
      .then((result) => {
        if (active) setOverview(result);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [refreshIndex]);

  const users = overview?.users || {};
  const applications = overview?.applications || {};
  const aiScans = overview?.ai?.scan_jobs || {};
  const pendingApplications = ['SUBMITTED', 'UNDER_REVIEW', 'READY_FOR_REVIEW']
    .reduce((total, status) => total + (applications[status] || 0), 0);
  const failedScans = aiScans.FAILED || 0;
  const recommendations = [];
  if (!overview?.ai?.configured) recommendations.push('Configure the AI provider credentials to enable external AI processing.');
  if (pendingApplications > 0) recommendations.push(`${pendingApplications} clinic application${pendingApplications === 1 ? '' : 's'} may need review.`);
  if (failedScans > 0) recommendations.push(`Review ${failedScans} failed AI scan${failedScans === 1 ? '' : 's'}.`);
  if (overview && recommendations.length === 0) recommendations.push('No outstanding application or AI scan issues were found in the current counts.');

  return (
    <main className="min-w-0 flex-1 overflow-y-auto p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl font-bold text-[#0d281e]">Platform Overview</h1>
            <p className="mt-1 text-sm text-slate-500">A live summary of platform health, users, clinics, applications, and AI processing.</p>
          </div>
          <button
            type="button"
            onClick={() => setRefreshIndex((current) => current + 1)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {error && (
          <div role="alert" className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Platform totals">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-500"><span className="text-sm">User accounts</span><Users className="h-4 w-4" /></div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">{loading && !overview ? '—' : Object.values(users).reduce((sum, count) => sum + count, 0)}</div>
            <p className="mt-1 text-xs text-slate-500">{users.ACTIVE || 0} active · {users.SUSPENDED || 0} suspended</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-500"><span className="text-sm">Registered clinics</span><Building2 className="h-4 w-4" /></div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">{loading && !overview ? '—' : overview?.registered_clinics ?? 0}</div>
            <p className="mt-1 text-xs text-slate-500">Approved clinic accounts</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-500"><span className="text-sm">Applications to review</span><Activity className="h-4 w-4" /></div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">{loading && !overview ? '—' : pendingApplications}</div>
            <p className="mt-1 text-xs text-slate-500">{applications.APPROVED || 0} approved · {applications.REJECTED || 0} rejected</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-500"><span className="text-sm">AI scans failed</span><Sparkles className="h-4 w-4" /></div>
            <div className={`mt-2 text-3xl font-semibold ${failedScans ? 'text-rose-700' : 'text-slate-900'}`}>{loading && !overview ? '—' : failedScans}</div>
            <p className="mt-1 text-xs text-slate-500">{aiScans.QUEUED || 0} queued · {aiScans.PROCESSING || 0} processing</p>
          </div>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">System health</h2>
            <p className="mt-1 text-sm text-slate-500">Service status from this overview request and its database checks.</p>
            {overview ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <HealthCard label="Admin API" value={formatLabel(overview.system_health.api)} detail="Overview service responding" />
                <HealthCard label="Database" value={formatLabel(overview.system_health.database)} detail="Live platform queries succeeded" />
                <HealthCard label="Storage config" value={formatLabel(overview.system_health.storage.status)} detail={`${formatLabel(overview.system_health.storage.backend)} backend; connectivity not probed`} healthy={false} />
              </div>
            ) : <p className="mt-4 text-sm text-slate-400">{loading ? 'Checking services…' : 'Health details unavailable.'}</p>}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">AI processing</h2>
            {overview ? (
              <>
                <p className="mt-1 text-sm text-slate-500">
                  {overview.ai.configured ? 'Provider credentials are configured.' : 'Provider credentials are not configured.'}
                  {' '}Model: {overview.ai.model}.
                </p>
                <div className="mt-4">
                  <StatusList title="Scan jobs" statuses={AI_STATUSES} counts={aiScans} />
                </div>
              </>
            ) : <p className="mt-4 text-sm text-slate-400">{loading ? 'Loading AI status…' : 'AI details unavailable.'}</p>}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">User accounts</h2>
            {overview ? <div className="mt-4"><StatusList title="Accounts by status" statuses={USER_STATUSES} counts={users} /></div> : <p className="mt-4 text-sm text-slate-400">{loading ? 'Loading account counts…' : 'Account details unavailable.'}</p>}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Clinic applications</h2>
            {overview ? (
              <dl className="mt-4 grid grid-cols-2 gap-3">
                {Object.entries(applications).sort(([left], [right]) => left.localeCompare(right)).map(([status, count]) => (
                  <div key={status} className="rounded-lg bg-slate-50 px-3 py-2">
                    <dt className="text-xs text-slate-500">{formatLabel(status)}</dt>
                    <dd className="mt-1 text-lg font-semibold text-slate-900">{count}</dd>
                  </div>
                ))}
                {!Object.keys(applications).length && <p className="text-sm text-slate-500">No applications yet.</p>}
              </dl>
            ) : <p className="mt-4 text-sm text-slate-400">{loading ? 'Loading application counts…' : 'Application details unavailable.'}</p>}
          </div>
        </section>

        <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Suggested follow-ups</h2>
          <p className="mt-1 text-xs text-slate-500">Rule-based operational checks, not AI-generated decisions.</p>
          {overview ? (
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {recommendations.map((recommendation) => <li key={recommendation} className="flex gap-2"><span className="text-emerald-700">•</span>{recommendation}</li>)}
            </ul>
          ) : <p className="mt-3 text-sm text-slate-400">{loading ? 'Preparing follow-ups…' : 'Follow-ups unavailable.'}</p>}
        </section>
      </div>
    </main>
  );
}
