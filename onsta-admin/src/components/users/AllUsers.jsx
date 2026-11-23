import React, { useEffect, useState } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, RefreshCw, Search, Users } from 'lucide-react';
import { fetchUserRoles, fetchUsers } from '../../api/adminApi';

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

export default function AllUsers() {
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
  const start = total === 0 ? 0 : offset + 1;
  const end = Math.min(offset + PAGE_SIZE, total);
  const displayError = error || roleError;

  return (
    <main className="min-w-0 flex-1 overflow-y-auto p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl font-bold text-[#0d281e]">All Users</h1>
            <p className="mt-1 text-sm text-slate-500">Directory of every platform and clinic user account.</p>
          </div>
          <button
            type="button"
            onClick={() => setRefreshIndex((current) => current + 1)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        <section className="mb-5 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-5">
          <label className="relative md:col-span-2 xl:col-span-1">
            <span className="sr-only">Search users</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={updateFilter(setSearch)}
              placeholder="Search name or email"
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-600"
            />
          </label>
          <label>
            <span className="sr-only">Filter by account type</span>
            <select value={accountType} onChange={updateFilter(setAccountType)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
              <option value="">All account types</option>
              {accountTypes.map(([value]) => <option key={value} value={value}>{formatAccountType(value)}</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by status</span>
            <select value={status} onChange={updateFilter(setStatus)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
              <option value="">All statuses</option>
              {statuses.map((value) => <option key={value} value={value}>{formatLabel(value)}</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by role</span>
            <select value={role} onChange={updateFilter(setRole)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
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
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-600"
            />
          </label>
        </section>

        {displayError && (
          <div role="alert" className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" /> {displayError}
          </div>
        )}

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">User</th>
                  <th className="px-5 py-3 font-semibold">Account type</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Roles</th>
                  <th className="px-5 py-3 font-semibold">Clinics</th>
                  <th className="px-5 py-3 font-semibold">Last sign-in</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan="6" className="px-5 py-12 text-center text-slate-500">Loading users…</td></tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-5 py-12 text-center text-slate-500">
                      <Users className="mx-auto mb-2 h-6 w-6 text-slate-300" />
                      No users match these filters.
                    </td>
                  </tr>
                ) : users.map((user) => (
                  <tr key={user.user_id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-900">{user.full_name}</div>
                      <div className="mt-0.5 text-xs text-slate-500">{user.email}</div>
                    </td>
                    <td className="px-5 py-4 text-slate-700">{formatAccountType(user.account_type)}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{formatLabel(user.status)}</span>
                    </td>
                    <td className="px-5 py-4 text-slate-700">{user.roles.length ? user.roles.map(formatLabel).join(', ') : '—'}</td>
                    <td className="px-5 py-4 text-slate-700">{user.clinics.length ? user.clinics.join(', ') : '—'}</td>
                    <td className="px-5 py-4 text-slate-500">{formatDate(user.last_login_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm text-slate-500">
            <span>{start}–{end} of {total}</span>
            <div className="flex gap-2">
              <button type="button" disabled={offset === 0 || loading} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} aria-label="Previous page" className="rounded-md border border-slate-200 p-1.5 disabled:opacity-40">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button type="button" disabled={offset + PAGE_SIZE >= total || loading} onClick={() => setOffset(offset + PAGE_SIZE)} aria-label="Next page" className="rounded-md border border-slate-200 p-1.5 disabled:opacity-40">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
