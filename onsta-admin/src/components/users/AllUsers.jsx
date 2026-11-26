import React, { useEffect, useState } from 'react';
import FaIcon from '../common/FaIcon';
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
    <main className="min-w-0 flex-1 overflow-y-auto p-6 lg:p-8 bg-[#F6F0FA]">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="alata-regular text-2xl text-[#1E1B2E]">All Users</h1>
            <p className="mt-1 text-sm text-[#64748B]">Directory of every platform and clinic user account.</p>
          </div>
          <button
            type="button"
            onClick={() => setRefreshIndex((current) => current + 1)}
            className="inline-flex items-center gap-2 rounded-full border border-[#DECBE9] bg-white px-4 py-2 text-xs alata-regular text-[#6B3B66] hover:bg-[#F0E6F6] shadow-sm transition"
          >
            <FaIcon icon="fa-solid fa-arrows-rotate" className={loading ? 'fa-spin' : ''} /> Refresh
          </button>
        </div>

        <section className="mb-5 grid gap-3 rounded-2xl border border-[#EAE0F2] bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-5">
          <label className="relative md:col-span-2 xl:col-span-1">
            <span className="sr-only">Search users</span>
            <FaIcon icon="fa-solid fa-magnifying-glass" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-[#64748B]" />
            <input
              value={search}
              onChange={updateFilter(setSearch)}
              placeholder="Search name or email"
              className="w-full rounded-xl border border-[#EAE0F2] bg-[#F8FAFC] py-2 pl-9 pr-3 text-sm text-[#1E1B2E] outline-none focus:border-[#6B3B66]"
            />
          </label>
          <label>
            <span className="sr-only">Filter by account type</span>
            <select value={accountType} onChange={updateFilter(setAccountType)} className="w-full rounded-xl border border-[#EAE0F2] bg-[#F8FAFC] px-3 py-2 text-sm text-[#1E1B2E] outline-none focus:border-[#6B3B66]">
              <option value="">All account types</option>
              {accountTypes.map(([value]) => <option key={value} value={value}>{formatAccountType(value)}</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by status</span>
            <select value={status} onChange={updateFilter(setStatus)} className="w-full rounded-xl border border-[#EAE0F2] bg-[#F8FAFC] px-3 py-2 text-sm text-[#1E1B2E] outline-none focus:border-[#6B3B66]">
              <option value="">All statuses</option>
              {statuses.map((value) => <option key={value} value={value}>{formatLabel(value)}</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by role</span>
            <select value={role} onChange={updateFilter(setRole)} className="w-full rounded-xl border border-[#EAE0F2] bg-[#F8FAFC] px-3 py-2 text-sm text-[#1E1B2E] outline-none focus:border-[#6B3B66]">
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
              className="w-full rounded-xl border border-[#EAE0F2] bg-[#F8FAFC] px-3 py-2 text-sm text-[#1E1B2E] outline-none focus:border-[#6B3B66]"
            />
          </label>
        </section>

        {displayError && (
          <div role="alert" className="mb-4 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <FaIcon icon="fa-solid fa-circle-exclamation" className="shrink-0" /> {displayError}
          </div>
        )}

        <section className="overflow-hidden rounded-3xl border border-[#EAE0F2] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="bg-[#F8FAFC] border-b border-[#EAE0F2] text-xs alata-regular uppercase tracking-wide text-[#64748B]">
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
              <tbody className="divide-y divide-[#EAE0F2]">
                {loading ? (
                  <tr><td colSpan="7" className="px-5 py-12 text-center text-[#64748B]">Loading users…</td></tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-5 py-12 text-center text-[#64748B]">
                      <FaIcon icon="fa-solid fa-users" className="mx-auto mb-2 text-xl text-[#DECBE9] block" />
                      No users match these filters.
                    </td>
                  </tr>
                ) : users.map((user) => (
                  <tr key={user.user_id} className="hover:bg-[#F6F0FA]/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="alata-regular text-[#1E1B2E]">{user.full_name}</div>
                      <div className="mt-0.5 text-xs text-[#64748B]">{user.email}</div>
                    </td>
                    <td className="px-5 py-4 text-[#1E1B2E]">{formatAccountType(user.account_type)}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs alata-regular border ${
                        user.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : user.status === 'SUSPENDED'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : user.status === 'DISABLED'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-[#F0E6F6] text-[#6B3B66] border-[#DECBE9]'
                      }`}>
                        {formatLabel(user.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-[#64748B]">{user.roles.length ? user.roles.map(formatLabel).join(', ') : '—'}</td>
                    <td className="px-5 py-4 text-[#64748B]">{user.clinics.length ? user.clinics.join(', ') : '—'}</td>
                    <td className="px-5 py-4 text-[#64748B]">{formatDate(user.last_login_at)}</td>
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
                                : 'border-[#DECBE9] text-[#6B3B66] hover:bg-[#F6F0FA]'
                            }`}
                          >
                            {actionLabel}
                          </button>
                        ))}
                        {(user.user_id === currentUserId || statusActions(user.status).length === 0) && (
                          <span className="text-xs text-[#64748B]">No actions</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-[#EAE0F2] bg-[#F8FAFC] px-5 py-3 text-sm text-[#64748B]">
            <span className="alata-regular text-xs">{start}–{end} of {total}</span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={offset === 0 || loading}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                aria-label="Previous page"
                className="rounded-full border border-[#EAE0F2] bg-white w-8 h-8 flex items-center justify-center hover:bg-[#F6F0FA] hover:text-[#6B3B66] disabled:opacity-40 transition"
              >
                <FaIcon icon="fa-solid fa-chevron-left" className="text-xs" />
              </button>
              <button
                type="button"
                disabled={offset + PAGE_SIZE >= total || loading}
                onClick={() => setOffset(offset + PAGE_SIZE)}
                aria-label="Next page"
                className="rounded-full border border-[#EAE0F2] bg-white w-8 h-8 flex items-center justify-center hover:bg-[#F6F0FA] hover:text-[#6B3B66] disabled:opacity-40 transition"
              >
                <FaIcon icon="fa-solid fa-chevron-right" className="text-xs" />
              </button>
            </div>
          </div>
        </section>
      </div>
      {statusDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1320]/50 backdrop-blur-sm p-4">
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-status-title"
            onSubmit={submitStatusChange}
            className="w-full max-w-md rounded-3xl border border-[#EAE0F2] bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="user-status-title" className="text-lg alata-regular text-[#1E1B2E]">{statusDialog.actionLabel} account?</h2>
                <p className="mt-1 text-sm text-[#64748B]">{statusDialog.user.full_name} · {statusDialog.user.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setStatusDialog(null)}
                aria-label="Close dialog"
                className="rounded-full p-1.5 text-[#64748B] hover:bg-[#F6F0FA] hover:text-[#1E1B2E]"
              >
                <FaIcon icon="fa-solid fa-xmark" />
              </button>
            </div>
            <p className="mt-4 text-sm text-[#64748B]">
              This will change the account status to <strong className="text-[#1E1B2E]">{formatLabel(statusDialog.nextStatus)}</strong>. Add a reason for the audit log.
            </p>
            <label className="mt-4 block text-sm font-medium text-[#1E1B2E]">
              Reason
              <textarea
                autoFocus
                required
                minLength={3}
                maxLength={4000}
                value={statusReason}
                onChange={(event) => setStatusReason(event.target.value)}
                rows={3}
                className="mt-1.5 w-full rounded-xl border border-[#EAE0F2] bg-[#F8FAFC] px-3 py-2 text-sm text-[#1E1B2E] outline-none focus:border-[#6B3B66]"
              />
            </label>
            {statusError && (
              <p role="alert" className="mt-3 flex items-center gap-2 text-sm text-rose-700">
                <FaIcon icon="fa-solid fa-circle-exclamation" className="shrink-0" />{statusError}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={updatingStatus}
                onClick={() => setStatusDialog(null)}
                className="rounded-full border border-[#EAE0F2] px-4 py-2 text-sm font-medium text-[#64748B] hover:bg-[#F6F0FA] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updatingStatus || statusReason.trim().length < 3}
                className="rounded-full bg-[#6B3B66] px-5 py-2 text-sm alata-regular text-white hover:bg-[#552B51] disabled:opacity-50 shadow-sm transition"
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
