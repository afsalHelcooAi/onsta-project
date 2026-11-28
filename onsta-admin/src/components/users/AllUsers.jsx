import React, { useEffect, useState } from 'react';
import AppIcon from '../common/AppIcon';
import { fetchUserRoles, fetchUsers, updateUserStatus } from '../../api/adminApi';

const PAGE_SIZE = 25;

const accountTypes = [
  ['PLATFORM_ADMIN', 'Platform Admin'],
  ['CLINIC_USER', 'Clinic User'],
  ['CLINIC_APPLICANT', 'Clinic Applicant'],
  ['UNASSIGNED', 'Unassigned'],
];

const statuses = ['ACTIVE', 'INVITED', 'SUSPENDED', 'DISABLED'];

function formatLabel(value) {
  return value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatAccountType(value) {
  return value === 'PLATFORM_ADMIN' ? 'Super Admin' : formatLabel(value);
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : 'Never';
}

function statusActions(status) {
  const actions = {
    ACTIVE: [['SUSPENDED', 'Suspend'], ['DISABLED', 'Disable']],
    INVITED: [['DISABLED', 'Disable']],
    SUSPENDED: [['ACTIVE', 'Reactivate'], ['DISABLED', 'Disable']],
    DISABLED: [['ACTIVE', 'Reactivate']],
  };
  return actions[status] || [];
}

export default function AllUsers({ currentUserId }) {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [search, setSearch] = useState('');
  const [accountType, setAccountType] = useState('');
  const [status, setStatus] = useState('');
  const [role, setRole] = useState('');
  const [clinic, setClinic] = useState('');
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roleError, setRoleError] = useState('');
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [statusDialog, setStatusDialog] = useState(null);
  const [statusReason, setStatusReason] = useState('');
  const [statusError, setStatusError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    fetchUserRoles()
      .then(setRoles)
      .catch((err) => setRoleError(err.message));
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    fetchUsers({ search, accountType, status, role, clinic, limit: PAGE_SIZE, offset })
      .then((result) => {
        if (!active) return;
        setUsers(result.items);
        setTotal(result.total);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [search, accountType, status, role, clinic, offset, refreshIndex]);

  const updateFilter = (setter) => (event) => {
    setter(event.target.value);
    setOffset(0);
  };
  const openStatusDialog = (user, nextStatus, actionLabel) => {
    setStatusDialog({ user, nextStatus, actionLabel });
    setStatusReason('');
    setStatusError('');
  };
  const submitStatusChange = async (event) => {
    event.preventDefault();
    if (!statusDialog || statusReason.trim().length < 3) return;
    setUpdatingStatus(true);
    setStatusError('');
    try {
      await updateUserStatus(statusDialog.user.user_id, statusDialog.nextStatus, statusReason.trim());
      setStatusDialog(null);
      setRefreshIndex((current) => current + 1);
    } catch (err) {
      setStatusError(err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };
  const start = total === 0 ? 0 : offset + 1;
  const end = Math.min(offset + PAGE_SIZE, total);
  const displayError = error || roleError;

  return (
    <main className="min-w-0 flex-1 overflow-y-auto p-6 lg:p-8 bg-theme-canvas">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="alata-regular text-2xl text-theme-ink">All Users</h1>
            <p className="mt-1 text-sm text-theme-muted">Directory of every platform and clinic user account.</p>
          </div>
          <button
            type="button"
            onClick={() => setRefreshIndex((current) => current + 1)}
            className="inline-flex items-center gap-2 rounded-full border border-theme-border-strong bg-theme-card px-4 py-2 text-xs alata-regular text-theme-primary hover:bg-theme-primary-soft shadow-sm transition"
          >
            <AppIcon name="refresh" spin={loading} /> Refresh
          </button>
        </div>

        <section className="mb-5 grid gap-3 rounded-2xl border border-theme-border bg-theme-card p-4 shadow-sm md:grid-cols-2 xl:grid-cols-5">
          <label className="relative md:col-span-2 xl:col-span-1">
            <span className="sr-only">Search users</span>
            <AppIcon name="search" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-theme-muted" />
            <input
              value={search}
              onChange={updateFilter(setSearch)}
              placeholder="Search name or email"
              className="w-full rounded-xl border border-theme-border bg-theme-surface py-2 pl-9 pr-3 text-sm text-theme-ink outline-none focus:border-theme-primary"
            />
          </label>
          <label>
            <span className="sr-only">Filter by account type</span>
            <select value={accountType} onChange={updateFilter(setAccountType)} className="w-full rounded-xl border border-theme-border bg-theme-surface px-3 py-2 text-sm text-theme-ink outline-none focus:border-theme-primary">
              <option value="">All account types</option>
              {accountTypes.map(([value]) => <option key={value} value={value}>{formatAccountType(value)}</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by status</span>
            <select value={status} onChange={updateFilter(setStatus)} className="w-full rounded-xl border border-theme-border bg-theme-surface px-3 py-2 text-sm text-theme-ink outline-none focus:border-theme-primary">
              <option value="">All statuses</option>
              {statuses.map((value) => <option key={value} value={value}>{formatLabel(value)}</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by role</span>
            <select value={role} onChange={updateFilter(setRole)} className="w-full rounded-xl border border-theme-border bg-theme-surface px-3 py-2 text-sm text-theme-ink outline-none focus:border-theme-primary">
              <option value="">All roles</option>
              <option value="CLINIC_APPLICANT">Clinic Applicant</option>
              {roles.map((item) => <option key={`${item.scope}-${item.name}`} value={item.name}>{formatLabel(item.name)} · {formatLabel(item.scope)}</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by clinic</span>
            <input
              value={clinic}
              onChange={updateFilter(setClinic)}
              placeholder="Clinic name or ID"
              className="w-full rounded-xl border border-theme-border bg-theme-surface px-3 py-2 text-sm text-theme-ink outline-none focus:border-theme-primary"
            />
          </label>
        </section>

        {displayError && (
          <div role="alert" className="mb-4 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AppIcon name="warning-circle" className="shrink-0" /> {displayError}
          </div>
        )}

        <section className="overflow-hidden rounded-3xl border border-theme-border bg-theme-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="bg-theme-surface border-b border-theme-border text-xs alata-regular uppercase tracking-wide text-theme-muted">
                <tr>
                  <th className="px-5 py-3.5">User</th>
                  <th className="px-5 py-3.5">Account type</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Roles</th>
                  <th className="px-5 py-3.5">Clinics</th>
                  <th className="px-5 py-3.5">Last sign-in</th>
                  <th className="px-5 py-3.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border">
                {loading ? (
                  <tr><td colSpan="7" className="px-5 py-12 text-center text-theme-muted">Loading users…</td></tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-5 py-12 text-center text-theme-muted">
                      <AppIcon name="users" className="mx-auto mb-2 text-xl text-theme-border-strong block" />
                      No users match these filters.
                    </td>
                  </tr>
                ) : users.map((user) => (
                  <tr key={user.user_id} className="hover:bg-theme-canvas/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="alata-regular text-theme-ink">{user.full_name}</div>
                      <div className="mt-0.5 text-xs text-theme-muted">{user.email}</div>
                    </td>
                    <td className="px-5 py-4 text-theme-ink">{formatAccountType(user.account_type)}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs alata-regular border ${
                        user.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : user.status === 'SUSPENDED'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : user.status === 'DISABLED'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-theme-primary-soft text-theme-primary border-theme-border-strong'
                      }`}>
                        {formatLabel(user.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-theme-muted">{user.roles.length ? user.roles.map(formatLabel).join(', ') : '—'}</td>
                    <td className="px-5 py-4 text-theme-muted">{user.clinics.length ? user.clinics.join(', ') : '—'}</td>
                    <td className="px-5 py-4 text-theme-muted">{formatDate(user.last_login_at)}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        {statusActions(user.status).filter(() => user.user_id !== currentUserId).map(([nextStatus, actionLabel]) => (
                          <button
                            key={nextStatus}
                            type="button"
                            onClick={() => openStatusDialog(user, nextStatus, actionLabel)}
                            className={`rounded-full border px-3 py-1 text-xs alata-regular transition ${
                              nextStatus === 'DISABLED'
                                ? 'border-rose-200 text-rose-700 hover:bg-rose-50'
                                : 'border-theme-border-strong text-theme-primary hover:bg-theme-canvas'
                            }`}
                          >
                            {actionLabel}
                          </button>
                        ))}
                        {(user.user_id === currentUserId || statusActions(user.status).length === 0) && (
                          <span className="text-xs text-theme-muted">No actions</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-theme-border bg-theme-surface px-5 py-3 text-sm text-theme-muted">
            <span className="alata-regular text-xs">{start}–{end} of {total}</span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={offset === 0 || loading}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                aria-label="Previous page"
                className="rounded-full border border-theme-border bg-theme-card min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-theme-canvas hover:text-theme-primary disabled:opacity-40 transition"
              >
                <AppIcon name="caret-left" className="text-sm" />
              </button>
              <button
                type="button"
                disabled={offset + PAGE_SIZE >= total || loading}
                onClick={() => setOffset(offset + PAGE_SIZE)}
                aria-label="Next page"
                className="rounded-full border border-theme-border bg-theme-card min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-theme-canvas hover:text-theme-primary disabled:opacity-40 transition"
              >
                <AppIcon name="caret-right" className="text-sm" />
              </button>
            </div>
          </div>
        </section>
      </div>
      {statusDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-theme-overlay/50 backdrop-blur-sm p-4">
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-status-title"
            onSubmit={submitStatusChange}
            className="w-full max-w-md rounded-3xl border border-theme-border bg-theme-card p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="user-status-title" className="text-lg alata-regular text-theme-ink">{statusDialog.actionLabel} account?</h2>
                <p className="mt-1 text-sm text-theme-muted">{statusDialog.user.full_name} · {statusDialog.user.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setStatusDialog(null)}
                aria-label="Close dialog"
                className="rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center text-theme-muted hover:bg-theme-canvas hover:text-theme-ink"
              >
                <AppIcon name="close" />
              </button>
            </div>
            <p className="mt-4 text-sm text-theme-muted">
              This will change the account status to <strong className="text-theme-ink">{formatLabel(statusDialog.nextStatus)}</strong>. Add a reason for the audit log.
            </p>
            <label className="mt-4 block text-sm font-medium text-theme-ink">
              Reason
              <textarea
                autoFocus
                required
                minLength={3}
                maxLength={4000}
                value={statusReason}
                onChange={(event) => setStatusReason(event.target.value)}
                rows={3}
                className="mt-1.5 w-full rounded-xl border border-theme-border bg-theme-surface px-3 py-2 text-sm text-theme-ink outline-none focus:border-theme-primary"
              />
            </label>
            {statusError && (
              <p role="alert" className="mt-3 flex items-center gap-2 text-sm text-rose-700">
                <AppIcon name="warning-circle" className="shrink-0" />{statusError}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={updatingStatus}
                onClick={() => setStatusDialog(null)}
                className="rounded-full border border-theme-border px-4 py-2 text-sm font-medium text-theme-muted hover:bg-theme-canvas disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updatingStatus || statusReason.trim().length < 3}
                className="rounded-full bg-theme-primary px-5 py-2 text-sm alata-regular text-white hover:bg-theme-primary-hover disabled:opacity-50 shadow-sm transition"
              >
                {updatingStatus ? 'Saving…' : 'Confirm change'}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
