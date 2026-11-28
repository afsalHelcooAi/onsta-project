import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
            <h1 className="alata-regular text-2xl text-theme-ink">{t('users.title')}</h1>
            <p className="mt-1 text-sm text-theme-muted">{t('users.subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={() => setRefreshIndex((current) => current + 1)}
            className="inline-flex items-center gap-2 rounded-full border border-theme-border-strong bg-theme-card px-4 py-2 text-xs alata-regular text-theme-primary hover:bg-theme-primary-soft shadow-sm transition"
          >
            <AppIcon name="refresh" spin={loading} /> {t('common.refresh')}
          </button>
        </div>

        <section className="mb-5 grid gap-3 rounded-2xl border border-theme-border bg-theme-card p-4 shadow-sm md:grid-cols-2 xl:grid-cols-5">
          <label className="relative md:col-span-2 xl:col-span-1">
            <span className="sr-only">{t('common.search')}</span>
            <AppIcon name="search" className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-xs text-theme-muted" />
            <input
              dir="auto"
              value={search}
              onChange={updateFilter(setSearch)}
              placeholder={t('users.searchPlaceholder')}
              className="w-full rounded-xl border border-theme-border bg-theme-surface py-2 ps-9 pe-3 text-sm text-theme-ink outline-none focus:border-theme-primary"
            />
          </label>
          <label>
            <span className="sr-only">{t('users.allAccountTypes')}</span>
            <select value={accountType} onChange={updateFilter(setAccountType)} className="w-full rounded-xl border border-theme-border bg-theme-surface px-3 py-2 text-sm text-theme-ink outline-none focus:border-theme-primary">
              <option value="">{t('users.allAccountTypes')}</option>
              {accountTypes.map(([value]) => (
                <option key={value} value={value}>
                  {value === 'PLATFORM_ADMIN'
                    ? t('users.platformAdmin')
                    : value === 'CLINIC_USER'
                    ? t('users.clinicUser')
                    : value === 'CLINIC_APPLICANT'
                    ? t('users.clinicApplicant')
                    : t('users.unassigned')}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">{t('users.allStatuses')}</span>
            <select value={status} onChange={updateFilter(setStatus)} className="w-full rounded-xl border border-theme-border bg-theme-surface px-3 py-2 text-sm text-theme-ink outline-none focus:border-theme-primary">
              <option value="">{t('users.allStatuses')}</option>
              {statuses.map((value) => <option key={value} value={value}>{formatLabel(value)}</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">{t('users.allRoles')}</span>
            <select value={role} onChange={updateFilter(setRole)} className="w-full rounded-xl border border-theme-border bg-theme-surface px-3 py-2 text-sm text-theme-ink outline-none focus:border-theme-primary">
              <option value="">{t('users.allRoles')}</option>
              <option value="CLINIC_APPLICANT">{t('users.clinicApplicant')}</option>
              {roles.map((item) => <option key={`${item.scope}-${item.name}`} value={item.name}>{formatLabel(item.name)} · {formatLabel(item.scope)}</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">{t('users.clinicPlaceholder')}</span>
            <input
              dir="auto"
              value={clinic}
              onChange={updateFilter(setClinic)}
              placeholder={t('users.clinicPlaceholder')}
              className="w-full rounded-xl border border-theme-border bg-theme-surface px-3 py-2 text-sm text-theme-ink outline-none focus:border-theme-primary"
            />
          </label>
        </section>

        {displayError && (
          <div role="alert" className="mb-4 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AppIcon name="warning-circle" className="shrink-0" /> <span dir="auto">{displayError}</span>
          </div>
        )}

        <section className="overflow-hidden rounded-3xl border border-theme-border bg-theme-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-start text-sm">
              <thead className="bg-theme-surface border-b border-theme-border text-xs alata-regular uppercase tracking-wide text-theme-muted">
                <tr>
                  <th className="px-5 py-3.5">{t('users.colUser')}</th>
                  <th className="px-5 py-3.5">{t('users.colAccountType')}</th>
                  <th className="px-5 py-3.5">{t('users.colStatus')}</th>
                  <th className="px-5 py-3.5">{t('users.colRoles')}</th>
                  <th className="px-5 py-3.5">{t('users.colClinics')}</th>
                  <th className="px-5 py-3.5">{t('users.colLastSignIn')}</th>
                  <th className="px-5 py-3.5">{t('users.colActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border">
                {loading ? (
                  <tr><td colSpan="7" className="px-5 py-12 text-center text-theme-muted">{t('users.loadingUsers')}</td></tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-5 py-12 text-center text-theme-muted">
                      <AppIcon name="users" className="mx-auto mb-2 text-xl text-theme-border-strong block" />
                      {t('users.noUsersMatch')}
                    </td>
                  </tr>
                ) : users.map((user) => (
                  <tr key={user.user_id} className="hover:bg-theme-canvas/50 transition-colors">
                    <td className="px-5 py-4">
                      <div dir="auto" className="alata-regular text-theme-ink">{user.full_name}</div>
                      <div dir="ltr" className="mt-0.5 text-xs text-theme-muted">{user.email}</div>
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
                    <td dir="auto" className="px-5 py-4 text-theme-muted">{user.clinics.length ? user.clinics.join(', ') : '—'}</td>
                    <td className="px-5 py-4 text-theme-muted">{user.last_login_at ? formatDate(user.last_login_at) : t('users.never')}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        {statusActions(user.status).filter(() => user.user_id !== currentUserId).map(([nextStatus, actionLabel]) => {
                          const translatedAction = actionLabel === 'Suspend' ? t('users.suspend') : actionLabel === 'Disable' ? t('users.disable') : t('users.reactivate');
                          return (
                          <button
                            key={nextStatus}
                            type="button"
                            onClick={() => openStatusDialog(user, nextStatus, translatedAction)}
                            className={`rounded-full border px-3 py-1 text-xs alata-regular transition ${
                              nextStatus === 'DISABLED'
                                ? 'border-rose-200 text-rose-700 hover:bg-rose-50'
                                : 'border-theme-border-strong text-theme-primary hover:bg-theme-canvas'
                            }`}
                          >
                            {translatedAction}
                          </button>
                          );
                        })}
                        {(user.user_id === currentUserId || statusActions(user.status).length === 0) && (
                          <span className="text-xs text-theme-muted">{t('users.noActions')}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-theme-border bg-theme-surface px-5 py-3 text-sm text-theme-muted">
            <span className="alata-regular text-xs">{t('users.rangeOf', { start, end, total })}</span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={offset === 0 || loading}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                aria-label={t('users.prevPage')}
                className="rounded-full border border-theme-border bg-theme-card min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-theme-canvas hover:text-theme-primary disabled:opacity-40 transition"
              >
                <AppIcon name="caret-left" className="text-sm rtl:rotate-180" />
              </button>
              <button
                type="button"
                disabled={offset + PAGE_SIZE >= total || loading}
                onClick={() => setOffset(offset + PAGE_SIZE)}
                aria-label={t('users.nextPage')}
                className="rounded-full border border-theme-border bg-theme-card min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-theme-canvas hover:text-theme-primary disabled:opacity-40 transition"
              >
                <AppIcon name="caret-right" className="text-sm rtl:rotate-180" />
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
                <h2 id="user-status-title" className="text-lg alata-regular text-theme-ink">{t('users.dialogTitle', { action: statusDialog.actionLabel })}</h2>
                <p className="mt-1 text-sm text-theme-muted">{statusDialog.user.full_name} · {statusDialog.user.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setStatusDialog(null)}
                aria-label={t('common.close')}
                className="rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center text-theme-muted hover:bg-theme-canvas hover:text-theme-ink"
              >
                <AppIcon name="close" />
              </button>
            </div>
            <p className="mt-4 text-sm text-theme-muted">
              {t('users.dialogDesc', { status: formatLabel(statusDialog.nextStatus) })}
            </p>
            <label className="mt-4 block text-sm font-medium text-theme-ink">
              {t('users.reasonLabel')}
              <textarea
                autoFocus
                required
                dir="auto"
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
                <AppIcon name="warning-circle" className="shrink-0" /><span dir="auto">{statusError}</span>
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={updatingStatus}
                onClick={() => setStatusDialog(null)}
                className="rounded-full border border-theme-border px-4 py-2 text-sm font-medium text-theme-muted hover:bg-theme-canvas disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={updatingStatus || statusReason.trim().length < 3}
                className="rounded-full bg-theme-primary px-5 py-2 text-sm alata-regular text-white hover:bg-theme-primary-hover disabled:opacity-50 shadow-sm transition"
              >
                {updatingStatus ? t('users.saving') : t('users.confirmChange')}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
