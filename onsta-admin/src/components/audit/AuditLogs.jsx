import React, { useEffect, useState } from 'react';
import AppIcon from '../common/AppIcon';
import { fetchAuditLogs } from '../../api/adminApi';

const PAGE_SIZE = 25;

const ACTIONS = [
  { value: 'ALL', label: 'All actions' },
  { value: 'CLINIC_APPROVED', label: 'Clinic approved' },
  { value: 'CLINIC_REJECTED', label: 'Clinic rejected' },
  { value: 'INFO_REQUESTED', label: 'Info requested' },
  { value: 'USER_STATUS_CHANGED', label: 'User status changed' },
];

const ENTITY_TYPES = [
  { value: 'ALL', label: 'All entities' },
  { value: 'CLINIC_APPLICATION', label: 'Clinic application' },
  { value: 'USER', label: 'User account' },
  { value: 'CLINIC', label: 'Clinic tenant' },
];

function formatTimestamp(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-AE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function ActionBadge({ action }) {
  switch (action) {
    case 'CLINIC_APPROVED':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] alata-regular text-emerald-700">
          <AppIcon name="shield-check" className="text-[11px]" /> Clinic Approved
        </span>
      );
    case 'CLINIC_REJECTED':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] alata-regular text-rose-700">
          <AppIcon name="x-circle" className="text-[11px]" /> Clinic Rejected
        </span>
      );
    case 'INFO_REQUESTED':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] alata-regular text-amber-700">
          <AppIcon name="warning-circle" className="text-[11px]" /> Info Requested
        </span>
      );
    case 'USER_STATUS_CHANGED':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-theme-border-strong bg-theme-primary-soft px-2.5 py-0.5 text-[11px] alata-regular text-theme-primary">
          <AppIcon name="user-gear" className="text-[11px]" /> Status Changed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-theme-border bg-theme-surface px-2.5 py-0.5 text-[11px] alata-regular text-theme-ink">
          <AppIcon name="clock" className="text-[11px]" /> {action.replace(/_/g, ' ')}
        </span>
      );
  }
}

function DetailSummary({ details }) {
  if (!details || typeof details !== 'object' || Object.keys(details).length === 0) {
    return <span className="text-theme-muted">No details recorded</span>;
  }

  const items = [];
  if (details.trading_name) items.push(<span key="name">Clinic: <b className="text-theme-ink">{details.trading_name}</b></span>);
  if (details.old_status && details.new_status) {
    items.push(
      <span key="status">
        Status: <code className="rounded bg-theme-canvas px-1.5 py-0.5 text-theme-muted">{details.old_status}</code> →{' '}
        <code className="rounded bg-theme-primary-soft px-1.5 py-0.5 font-semibold text-theme-primary">{details.new_status}</code>
      </span>
    );
  }
  if (details.reason) items.push(<span key="reason">Reason: <i>&ldquo;{details.reason}&rdquo;</i></span>);
  if (details.message) items.push(<span key="msg">Message: <i>&ldquo;{details.message}&rdquo;</i></span>);
  if (details.requested_fields && details.requested_fields.length > 0) {
    items.push(<span key="fields">Fields: {details.requested_fields.join(', ')}</span>);
  }

  if (items.length === 0) {
    return <span className="text-theme-muted font-mono text-[11px]">{JSON.stringify(details)}</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-theme-muted">
      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 && <span className="text-theme-border-strong">•</span>}
          {item}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    fetchAuditLogs({
      search: debouncedSearch,
      action: actionFilter,
      entityType: entityFilter,
      limit: PAGE_SIZE,
      offset,
    })
      .then((res) => {
        if (!active) return;
        setLogs(res.items);
        setTotal(res.total);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Could not load audit logs.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [debouncedSearch, actionFilter, entityFilter, offset, refreshKey]);

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden bg-theme-canvas">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-theme-border bg-theme-card px-6 py-5 shadow-sm sm:px-8">
        <div>
          <h1 className="alata-regular text-xl text-theme-ink">Audit &amp; Activity Logs</h1>
          <p className="mt-1 text-xs text-theme-muted">
            Immutable administrative record of user status changes, verification decisions, and platform events.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRefreshKey((k) => k + 1)}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full border border-theme-border-strong bg-theme-canvas px-4 py-2 text-xs alata-regular text-theme-primary hover:bg-theme-primary-soft disabled:opacity-60 transition"
        >
          <AppIcon name="refresh" spin={loading} /> Refresh
        </button>
      </header>

      {error && (
        <div role="alert" className="border-b border-rose-200 bg-rose-50 px-6 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="border-b border-theme-border bg-theme-surface p-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex flex-1 flex-wrap items-center gap-2 sm:max-w-xl">
            <label className="relative min-w-[200px] flex-1">
              <AppIcon name="search" className="absolute left-3.5 top-3 text-xs text-theme-muted" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
                placeholder="Search actor, action, or details..."
                className="w-full rounded-xl border border-theme-border bg-theme-card py-2 pl-9 pr-3 text-sm text-theme-ink outline-none focus:border-theme-primary"
              />
            </label>
            <select
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setOffset(0); }}
              aria-label="Filter by action"
              className="rounded-xl border border-theme-border bg-theme-card px-3 py-2 text-sm text-theme-ink outline-none focus:border-theme-primary"
            >
              {ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
            <select
              value={entityFilter}
              onChange={(e) => { setEntityFilter(e.target.value); setOffset(0); }}
              aria-label="Filter by entity type"
              className="rounded-xl border border-theme-border bg-theme-card px-3 py-2 text-sm text-theme-ink outline-none focus:border-theme-primary"
            >
              {ENTITY_TYPES.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
          </div>
          <div className="text-xs alata-regular text-theme-muted">
            {total} {total === 1 ? 'event' : 'events'} logged
          </div>
        </div>
      </div>

      {/* Main Table / List */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          {loading && logs.length === 0 ? (
            <p className="p-12 text-center text-sm text-theme-muted">Loading audit trail…</p>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-theme-border-strong bg-theme-card p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-theme-primary-soft text-theme-primary flex items-center justify-center mb-3 border border-theme-border-strong">
                <AppIcon name="scroll" className="text-xl" />
              </div>
              <h3 className="text-base alata-regular text-theme-ink">No audit events found</h3>
              <p className="mt-1 text-xs text-theme-muted">
                {search || actionFilter !== 'ALL' || entityFilter !== 'ALL'
                  ? 'No events match your active filters.'
                  : 'Administrative actions will appear here as they are performed.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => {
                const isExpanded = expandedId === log.id;
                return (
                  <div
                    key={log.id}
                    className="rounded-2xl border border-theme-border bg-theme-card p-4 shadow-sm transition hover:border-theme-border-strong"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-theme-primary-soft border border-theme-border-strong text-theme-primary">
                          <AppIcon name="user" className="text-sm" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="alata-regular text-theme-ink text-sm">
                              {log.actor_name || log.actor_email || 'System'}
                            </span>
                            {log.actor_email && log.actor_name && (
                              <span className="text-xs text-theme-muted">({log.actor_email})</span>
                            )}
                            <ActionBadge action={log.action} />
                          </div>
                          <div className="mt-1">
                            <DetailSummary details={log.details} />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xs font-medium text-theme-muted">{formatTimestamp(log.created_at)}</p>
                          <p className="text-[10px] text-theme-muted font-mono">
                            {log.entity_type} {log.entity_id ? `· ${log.entity_id.slice(0, 8)}…` : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : log.id)}
                          aria-label={isExpanded ? 'Collapse JSON payload' : 'Expand JSON payload'}
                          className="rounded-full border border-theme-border min-w-[44px] min-h-[44px] flex items-center justify-center text-theme-muted hover:bg-theme-canvas hover:text-theme-primary transition"
                        >
                          <AppIcon name={isExpanded ? 'caret-up' : 'caret-down'} className="text-sm" />
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 rounded-xl border border-theme-border bg-theme-surface p-3 text-xs">
                        <p className="alata-regular text-theme-ink mb-1">Raw Payload Details:</p>
                        <pre className="overflow-x-auto font-mono text-[11px] text-theme-muted">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                        {log.ip_address && (
                          <p className="mt-2 text-[10px] text-theme-muted">IP address: {log.ip_address}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Pagination Footer */}
      <footer className="border-t border-theme-border bg-theme-card px-6 py-3 text-xs text-theme-muted sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <span className="alata-regular">Page {page} of {pageCount} ({total} total records)</span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={offset === 0 || loading}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              className="rounded-full border border-theme-border min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-theme-canvas hover:text-theme-primary disabled:opacity-40 transition"
              aria-label="Previous page"
            >
              <AppIcon name="caret-left" className="text-sm" />
            </button>
            <button
              type="button"
              disabled={offset + PAGE_SIZE >= total || loading}
              onClick={() => setOffset(offset + PAGE_SIZE)}
              className="rounded-full border border-theme-border min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-theme-canvas hover:text-theme-primary disabled:opacity-40 transition"
              aria-label="Next page"
            >
              <AppIcon name="caret-right" className="text-sm" />
            </button>
          </div>
        </div>
      </footer>
    </main>
  );
}
