import React, { useEffect, useState } from 'react';
import FaIcon from '../common/FaIcon';
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
          <FaIcon icon="fa-solid fa-shield-halved" className="text-[10px]" /> Clinic Approved
        </span>
      );
    case 'CLINIC_REJECTED':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] alata-regular text-rose-700">
          <FaIcon icon="fa-solid fa-circle-xmark" className="text-[10px]" /> Clinic Rejected
        </span>
      );
    case 'INFO_REQUESTED':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] alata-regular text-amber-700">
          <FaIcon icon="fa-solid fa-circle-exclamation" className="text-[10px]" /> Info Requested
        </span>
      );
    case 'USER_STATUS_CHANGED':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#DECBE9] bg-[#F0E6F6] px-2.5 py-0.5 text-[11px] alata-regular text-[#6B3B66]">
          <FaIcon icon="fa-solid fa-user-gear" className="text-[10px]" /> Status Changed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#EAE0F2] bg-[#F8FAFC] px-2.5 py-0.5 text-[11px] alata-regular text-[#1E1B2E]">
          <FaIcon icon="fa-regular fa-clock" className="text-[10px]" /> {action.replace(/_/g, ' ')}
        </span>
      );
  }
}

function DetailSummary({ details }) {
  if (!details || typeof details !== 'object' || Object.keys(details).length === 0) {
    return <span className="text-[#64748B]">No details recorded</span>;
  }

  const items = [];
  if (details.trading_name) items.push(<span key="name">Clinic: <b className="text-[#1E1B2E]">{details.trading_name}</b></span>);
  if (details.old_status && details.new_status) {
    items.push(
      <span key="status">
        Status: <code className="rounded bg-[#F6F0FA] px-1.5 py-0.5 text-[#64748B]">{details.old_status}</code> →{' '}
        <code className="rounded bg-[#F0E6F6] px-1.5 py-0.5 font-semibold text-[#6B3B66]">{details.new_status}</code>
      </span>
    );
  }
  if (details.reason) items.push(<span key="reason">Reason: <i>&ldquo;{details.reason}&rdquo;</i></span>);
  if (details.message) items.push(<span key="msg">Message: <i>&ldquo;{details.message}&rdquo;</i></span>);
  if (details.requested_fields && details.requested_fields.length > 0) {
    items.push(<span key="fields">Fields: {details.requested_fields.join(', ')}</span>);
  }

  if (items.length === 0) {
    return <span className="text-[#64748B] font-mono text-[11px]">{JSON.stringify(details)}</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#64748B]">
      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 && <span className="text-[#DECBE9]">•</span>}
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
    <main className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden bg-[#F6F0FA]">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#EAE0F2] bg-white px-6 py-5 shadow-sm sm:px-8">
        <div>
          <h1 className="alata-regular text-xl text-[#1E1B2E]">Audit &amp; Activity Logs</h1>
          <p className="mt-1 text-xs text-[#64748B]">
            Immutable administrative record of user status changes, verification decisions, and platform events.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRefreshKey((k) => k + 1)}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full border border-[#DECBE9] bg-[#F6F0FA] px-4 py-2 text-xs alata-regular text-[#6B3B66] hover:bg-[#F0E6F6] disabled:opacity-60 transition"
        >
          <FaIcon icon="fa-solid fa-arrows-rotate" className={loading ? 'fa-spin' : ''} /> Refresh
        </button>
      </header>

      {error && (
        <div role="alert" className="border-b border-rose-200 bg-rose-50 px-6 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="border-b border-[#EAE0F2] bg-[#F8FAFC] p-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex flex-1 flex-wrap items-center gap-2 sm:max-w-xl">
            <label className="relative min-w-[200px] flex-1">
              <FaIcon icon="fa-solid fa-magnifying-glass" className="absolute left-3.5 top-3 text-xs text-[#64748B]" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
                placeholder="Search actor, action, or details..."
                className="w-full rounded-xl border border-[#EAE0F2] bg-white py-2 pl-9 pr-3 text-sm text-[#1E1B2E] outline-none focus:border-[#6B3B66]"
              />
            </label>
            <select
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setOffset(0); }}
              aria-label="Filter by action"
              className="rounded-xl border border-[#EAE0F2] bg-white px-3 py-2 text-sm text-[#1E1B2E] outline-none focus:border-[#6B3B66]"
            >
              {ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
            <select
              value={entityFilter}
              onChange={(e) => { setEntityFilter(e.target.value); setOffset(0); }}
              aria-label="Filter by entity type"
              className="rounded-xl border border-[#EAE0F2] bg-white px-3 py-2 text-sm text-[#1E1B2E] outline-none focus:border-[#6B3B66]"
            >
              {ENTITY_TYPES.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
          </div>
          <div className="text-xs alata-regular text-[#64748B]">
            {total} {total === 1 ? 'event' : 'events'} logged
          </div>
        </div>
      </div>

      {/* Main Table / List */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          {loading && logs.length === 0 ? (
            <p className="p-12 text-center text-sm text-[#64748B]">Loading audit trail…</p>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[#DECBE9] bg-white p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#F0E6F6] text-[#6B3B66] flex items-center justify-center mb-3 border border-[#DECBE9]">
                <FaIcon icon="fa-solid fa-scroll" className="text-xl" />
              </div>
              <h3 className="text-base alata-regular text-[#1E1B2E]">No audit events found</h3>
              <p className="mt-1 text-xs text-[#64748B]">
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
                    className="rounded-2xl border border-[#EAE0F2] bg-white p-4 shadow-sm transition hover:border-[#DECBE9]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F0E6F6] border border-[#DECBE9] text-[#6B3B66]">
                          <FaIcon icon="fa-solid fa-user" className="text-sm" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="alata-regular text-[#1E1B2E] text-sm">
                              {log.actor_name || log.actor_email || 'System'}
                            </span>
                            {log.actor_email && log.actor_name && (
                              <span className="text-xs text-[#64748B]">({log.actor_email})</span>
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
                          <p className="text-xs font-medium text-[#64748B]">{formatTimestamp(log.created_at)}</p>
                          <p className="text-[10px] text-[#64748B] font-mono">
                            {log.entity_type} {log.entity_id ? `· ${log.entity_id.slice(0, 8)}…` : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : log.id)}
                          aria-label={isExpanded ? 'Collapse JSON payload' : 'Expand JSON payload'}
                          className="rounded-full border border-[#EAE0F2] w-7 h-7 flex items-center justify-center text-[#64748B] hover:bg-[#F6F0FA] hover:text-[#6B3B66] transition"
                        >
                          <FaIcon icon={isExpanded ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'} className="text-xs" />
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 rounded-xl border border-[#EAE0F2] bg-[#F8FAFC] p-3 text-xs">
                        <p className="alata-regular text-[#1E1B2E] mb-1">Raw Payload Details:</p>
                        <pre className="overflow-x-auto font-mono text-[11px] text-[#64748B]">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                        {log.ip_address && (
                          <p className="mt-2 text-[10px] text-[#64748B]">IP address: {log.ip_address}</p>
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
      <footer className="border-t border-[#EAE0F2] bg-white px-6 py-3 text-xs text-[#64748B] sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <span className="alata-regular">Page {page} of {pageCount} ({total} total records)</span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={offset === 0 || loading}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              className="rounded-full border border-[#EAE0F2] w-8 h-8 flex items-center justify-center hover:bg-[#F6F0FA] hover:text-[#6B3B66] disabled:opacity-40 transition"
              aria-label="Previous page"
            >
              <FaIcon icon="fa-solid fa-chevron-left" className="text-xs" />
            </button>
            <button
              type="button"
              disabled={offset + PAGE_SIZE >= total || loading}
              onClick={() => setOffset(offset + PAGE_SIZE)}
              className="rounded-full border border-[#EAE0F2] w-8 h-8 flex items-center justify-center hover:bg-[#F6F0FA] hover:text-[#6B3B66] disabled:opacity-40 transition"
              aria-label="Next page"
            >
              <FaIcon icon="fa-solid fa-chevron-right" className="text-xs" />
            </button>
          </div>
        </div>
      </footer>
    </main>
  );
}
